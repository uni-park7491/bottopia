"""BOTTOPIA local TTS connector. Python stdlib server, loopback only, session token.

No web-triggered installs, arbitrary commands, model URLs or file system paths.
"""
import argparse
import base64
import hmac
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import wave
from catalog import MODELS, LANGUAGES, VOICES, REFERENCE_ALLOWED, REFERENCE_REQUIRED

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('BOTTOPIA_TTS_HOME', str(Path.home() / '.bottopia-tts'))).resolve()
ORIGINS = {'https://bottopia.studio', 'https://www.bottopia.studio', 'http://127.0.0.1:3001', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://localhost:3000'}
PORT = 47831
MAX_BODY = 15_000_000


def environment(model):
    return DATA / model / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')


def working_directory(model):
    return DATA / model / 'source' if MODELS[model].get('repo') else ROOT


def install(model):
    recipe = MODELS[model]
    if model in ('qwen-custom', 'qwen-design'):
        print('Qwen 소스 연결기: QWEN-THIRD-PARTY-NOTICES.md와 licenses/Qwen-Apache-2.0.txt를 확인하세요.')
        print('외부 패키지·가중치는 공식 출처에서 별도로 내려받습니다. 서명·공증 또는 모든 PC 실행 검증을 뜻하지 않습니다.')
        print('지금은 PyTorch 등 여러 실행 패키지를 설치합니다. 인터넷·기기 상태에 따라 시간이 걸립니다.')
        print('선택한 Qwen 모델 약 4.52 GB는 첫 음성 생성 때 추가 다운로드됩니다. 패키지·캐시 공간은 별도입니다.')
    executable = shutil.which('python' + recipe['python'])
    if not executable and sys.version_info[:2] == tuple(map(int, recipe['python'].split('.'))): executable = sys.executable
    if not executable: raise RuntimeError('Python ' + recipe['python'] + '를 먼저 설치해주세요. https://www.python.org/downloads/')
    env = DATA / model
    env.mkdir(parents=True, exist_ok=True)
    subprocess.run([executable, '-m', 'venv', str(env)], check=True)
    py = str(environment(model))
    subprocess.run([py, '-m', 'pip', 'install', '--upgrade', 'pip'], check=True)
    if recipe.get('repo'):
        source = working_directory(model)
        if not source.exists():
            subprocess.run(['git', 'clone', recipe['repo'], str(source)], check=True)
            subprocess.run(['git', 'checkout', '--detach', recipe['revision']], cwd=source, check=True)
            subprocess.run(['git', 'submodule', 'update', '--init', '--recursive'], cwd=source, check=True)
        actual = subprocess.check_output(['git','rev-parse','HEAD'], cwd=source, text=True).strip()
        if actual != recipe['revision']: raise RuntimeError('소스 버전이 다릅니다. 기존 파일을 덮어쓰지 않습니다.')
        subprocess.run([py, '-m', 'pip', 'install', '-r', 'requirements.txt'], cwd=source, check=True)
    else:
        subprocess.run([py, '-m', 'pip', 'install', *recipe['packages']], check=True)
    subprocess.run([py, '-m', 'pip', 'install', 'soundfile==0.14.0', 'scipy'], check=True)
    if model == 'melo': subprocess.run([py, '-m', 'unidic', 'download'], check=True)
    if model == 'cosyvoice':
        subprocess.run([py, '-c', "from huggingface_hub import snapshot_download; snapshot_download('FunAudioLLM/Fun-CosyVoice3-0.5B-2512',local_dir='pretrained_models/Fun-CosyVoice3-0.5B')"], cwd=working_directory(model), check=True)
    print('설치 단계 종료. 연결기에서 환경을 다시 확인합니다. 첫 생성 시 모델 다운로드가 추가로 진행됩니다.')
    if model == 'gpt-sovits': print('GPT-SoVITS 공식 설치 문서에 따라 pretrained_models와 tts_infer.yaml을 구성하세요. README.md 참조.')
    if model == 'csm': print('CSM/Llama 모델 접근 승인은 사용자가 Hugging Face에서 직접 완료해야 합니다. 유료 API 키가 아닙니다.')


def availability(model):
    py = environment(model)
    recipe = MODELS[model]
    if not py.is_file(): return {'state':'not_installed', 'message':'PC 모델 환경 설치 필요'}
    cwd = working_directory(model)
    if recipe.get('assets') and not (cwd / recipe['assets']).is_file(): return {'state':'assets_missing','message':'공식 사전 학습 모델 파일 설치 필요'}
    try:
        code = 'import ' + recipe['module']
        if recipe.get('cuda'): code += "; import torch; assert torch.cuda.is_available(), 'CUDA GPU required'"
        run = subprocess.run([str(py), '-c', code], cwd=cwd, capture_output=True, timeout=45)
        if run.returncode: return {'state':'environment_error','message':'모델 환경 또는 GPU 확인 실패. PC 연결기에서 doctor 실행'}
        return {'state':'installed','message':'실행 환경 확인됨 · 모델 다운로드/실제 생성은 별도'}
    except (OSError, subprocess.TimeoutExpired): return {'state':'environment_error','message':'실행 환경 검사 실패 또는 시간 초과'}


def validate(payload):
    if not isinstance(payload, dict): raise ValueError('Invalid request')
    allowed = {'model','text','language','voice','instruct','speed','expression','reference','reference_text','reference_language','consent'}
    if set(payload) - allowed: raise ValueError('Unknown request fields')
    p = dict(payload)
    if p.get('model') not in MODELS: raise ValueError('Unknown model')
    model = p['model']
    for key, limit in [('text',500),('instruct',1000),('reference_text',1000)]:
        value = p.get(key, '')
        if not isinstance(value, str) or len(value) > limit: raise ValueError('Invalid '+key)
        p[key] = value.strip()
    if not p['text']: raise ValueError('대사를 입력해주세요.')
    if p.get('language') not in LANGUAGES[model]: raise ValueError('Unsupported language')
    if p.get('reference_language',p['language']) not in LANGUAGES[model]: raise ValueError('Unsupported reference language')
    if p.get('voice','') not in VOICES.get(model, ['default']): raise ValueError('Invalid voice')
    for key, low, high, default in [('speed',.5,2,1),('expression',0,1,.5)]:
        n = p.get(key, default)
        if isinstance(n, bool) or not isinstance(n,(float,int)) or not math.isfinite(n) or not low <= n <= high: raise ValueError('Invalid '+key)
        p[key] = n
    if p.get('consent') is not True: raise ValueError('다운로드·사용 조건 확인이 필요합니다.')
    if model in {'qwen-design','parler'} and not p['instruct']: raise ValueError('목소리 설명을 입력해주세요.')
    reference = p.pop('reference', '')
    if reference:
        if model not in REFERENCE_ALLOWED or not isinstance(reference,str) or len(reference) > 14_000_000: raise ValueError('Invalid reference')
        raw = base64.b64decode(reference, validate=True)
        with wave.open(io.BytesIO(raw), 'rb') as audio:
            if audio.getsampwidth() != 2 or audio.getnchannels() != 1 or audio.getframerate() != 24000 or not 1 <= audio.getnframes() / 24000 <= 60: raise ValueError('기준 음성은 PCM16 mono 24kHz WAV, 1–60초여야 합니다.')
        p['_reference_bytes'] = raw
        if model in {'gpt-sovits','cosyvoice','csm','omnivoice'} and not p['reference_text']: raise ValueError('기준 음성의 대사도 입력해주세요.')
    elif model in REFERENCE_REQUIRED: raise ValueError('이 모델은 기준 음성이 필요합니다.')
    return p


def stop_process(process):
    if process and process.poll() is None:
        if os.name == 'nt': process.kill()
        else:
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass


class Service:
    def __init__(self, token=None):
        self.token = token or secrets.token_urlsafe(32)
        self.jobs = {}
        self.lock = threading.Lock()
        self.status = {m: {'state':'not_installed','message':'PC 환경 확인 중'} for m in MODELS}

    def refresh(self):
        for model in MODELS: self.status[model] = availability(model)

    def create(self, p):
        with self.lock:
            if any(j['state'] in ('queued','running') for j in self.jobs.values()): raise RuntimeError('이미 생성 중입니다. 완료하거나 중단한 뒤 다시 시도하세요.')
            # Results expire at the next request or after 30 minutes, never persist user audio.
            for key,j in list(self.jobs.items()):
                if time.time()-j['created'] > 1800 or len(self.jobs) >= 4:
                    shutil.rmtree(j['directory']); del self.jobs[key]
            key = secrets.token_hex(16)
            directory = Path(tempfile.mkdtemp(prefix='bottopia-tts-'))
            job = {'state':'queued','created':time.time(),'directory':directory,'process':None,'message':'PC에서 모델을 준비합니다. 최초 다운로드는 시간이 걸릴 수 있습니다.'}
            self.jobs[key] = job
        threading.Thread(target=self.run,args=(job,p),daemon=True).start()
        return key

    def run(self, job, p):
        try:
            model = p['model']
            py = environment(model)
            if not py.is_file(): raise RuntimeError('먼저 PC 연결기에서 이 모델을 설치해주세요.')
            directory = job['directory']
            raw = p.pop('_reference_bytes',None)
            if raw:
                reference = directory / 'reference.wav'; reference.write_bytes(raw); p['reference_path'] = str(reference)
            p['voice_dir'] = str(DATA / 'voices')
            request = directory / 'request.json'; request.write_text(json.dumps(p),encoding='utf-8')
            output = directory / 'output.wav'
            with (directory / 'diagnostic.log').open('wb') as log:
                with self.lock:
                    if job['state'] == 'cancelled': return
                    job['state'] = 'running'
                    env = {**os.environ, 'PYTHONPATH':str(working_directory(model)), 'PYTHONUNBUFFERED':'1'}
                    process = subprocess.Popen([str(py), str(ROOT/'runner.py'), str(request), str(output)],cwd=working_directory(model),stdout=log,stderr=log,env=env,start_new_session=os.name != 'nt')
                    job['process'] = process
                try: code = process.wait(timeout=1800)
                except subprocess.TimeoutExpired:
                    stop_process(process); raise RuntimeError('30분 제한 시간을 초과했습니다. 다운로드·PC 환경을 확인해주세요.')
            if job['state'] == 'cancelled': return
            if code: raise RuntimeError('모델 실행 실패. PC 연결기 doctor와 작업 로그를 확인해주세요. 모델 접근 권한·메모리·의존성이 원인일 수 있습니다.')
            if not output.is_file() or output.stat().st_size > 10_000_000: raise RuntimeError('음성 출력이 없거나 크기 제한을 넘었습니다.')
            with wave.open(str(output),'rb') as audio:
                if audio.getnchannels()!=1 or audio.getsampwidth()!=2 or audio.getframerate()!=24000 or not 0 < audio.getnframes() <= 24000*180: raise RuntimeError('Invalid WAV output')
                job['seconds'] = audio.getnframes()/24000
            job.update(state='done',message='음성이 완성되었습니다.')
        except Exception as exc:
            if job['state'] != 'cancelled': job.update(state='error',message=str(exc) if isinstance(exc,RuntimeError) else 'PC 실행 중 오류가 발생했습니다. 작업 로그를 확인해주세요.')
        finally:
            # Prompt/reference no longer needed. Log remains on this PC until result expiry.
            for name in ['request.json','reference.wav']:
                (job['directory']/name).unlink(missing_ok=True)
            print('TTS job:',job['state'],'log:',job['directory']/'diagnostic.log',flush=True)

    def close(self):
        for job in self.jobs.values():
            job['state']='cancelled'; stop_process(job.get('process'))


def handler(service):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args): pass  # no token, text or reference logging
        def gate(self, auth=True):
            if self.headers.get('Host') not in {f'127.0.0.1:{PORT}', f'localhost:{PORT}'}: return False
            if self.headers.get('Origin') not in ORIGINS: return False
            return not auth or hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+service.token)
        def reply(self,code,data,content_type='application/json'):
            raw=json.dumps(data).encode() if content_type=='application/json' else data
            self.send_response(code)
            if self.headers.get('Origin') in ORIGINS:
                self.send_header('Access-Control-Allow-Origin',self.headers['Origin'])
                self.send_header('Vary','Origin')
            self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Type',content_type); self.send_header('Content-Length',str(len(raw))); self.end_headers()
            try: self.wfile.write(raw)
            except (BrokenPipeError,ConnectionResetError): pass
        def do_OPTIONS(self):
            if not self.gate(False): return self.reply(403,{'error':'Origin rejected'})
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin',self.headers['Origin'])
            self.send_header('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type')
            self.send_header('Access-Control-Allow-Private-Network','true')
            self.send_header('Vary','Origin'); self.end_headers()
        def do_GET(self):
            if not self.gate(): return self.reply(403,{'error':'연결 코드를 확인해주세요.'})
            if self.path == '/v1/models': return self.reply(200,{'protocol':1,'models':service.status})
            parts=self.path.split('/')
            if len(parts) not in (4,5) or parts[1:3] != ['v1','jobs']: return self.reply(404,{'error':'Not found'})
            job=service.jobs.get(parts[3])
            if not job: return self.reply(404,{'error':'작업을 찾을 수 없습니다.'})
            if len(parts)==5:
                if parts[4]!='audio' or job['state']!='done': return self.reply(409,{'error':'음성 생성이 완료되지 않았습니다.'})
                return self.reply(200,(job['directory']/'output.wav').read_bytes(),'audio/wav')
            result = {k:job[k] for k in ['state','message','seconds'] if k in job}
            try:
                progress_file = job['directory'] / 'progress.json'
                if progress_file.stat().st_size <= 1024:
                    stage = json.loads(progress_file.read_text(encoding='utf-8')).get('stage')
                    if stage in {'preparing','downloading','loading','generating','encoding'}:
                        result['stage'] = stage
            except (OSError, ValueError, AttributeError): pass
            return self.reply(200,result)
        def do_POST(self):
            if not self.gate(): return self.reply(403,{'error':'연결 코드를 확인해주세요.'})
            if self.path != '/v1/jobs': return self.reply(404,{'error':'Not found'})
            if self.headers.get('Content-Type')!='application/json': return self.reply(415,{'error':'JSON required'})
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0 < size <= MAX_BODY: return self.reply(413,{'error':'요청 크기 초과'})
                self.connection.settimeout(15)
                payload=validate(json.loads(self.rfile.read(size)))
                key=service.create(payload)
                self.reply(202,{'id':key})
            except (ValueError,TypeError,wave.Error) as exc: self.reply(400,{'error':str(exc)})
            except RuntimeError as exc: self.reply(409,{'error':str(exc)})
            except (OSError,TimeoutError): self.reply(408,{'error':'Request timeout'})
        def do_DELETE(self):
            if not self.gate(): return self.reply(403,{'error':'Forbidden'})
            parts=self.path.split('/')
            if len(parts)!=4 or parts[1:3]!=['v1','jobs']: return self.reply(404,{'error':'Not found'})
            with service.lock:
                job=service.jobs.get(parts[3])
                if not job: return self.reply(404,{'error':'Not found'})
                if job['state'] in ('queued','running'):
                    job.update(state='cancelled',message='생성을 중단했습니다.');stop_process(job.get('process'))
            self.reply(200,{'state':job['state']})
    return Handler


def main():
    parser=argparse.ArgumentParser(description='BOTTOPIA PC TTS 연결기')
    parser.add_argument('command',nargs='?',choices=['serve','install','doctor','menu'],default='serve')
    parser.add_argument('model',nargs='?',choices=list(MODELS))
    args=parser.parse_args()
    if args.command=='menu':
        names=list(MODELS)
        while True:
            print('\nBOTTOPIA TTS · 필요한 모델만 설치합니다.\n0: 홈페이지 연결 시작 / q: 종료')
            for i,m in enumerate(names,1): print(f'{i}: {m} (Python {MODELS[m]["python"]})')
            choice=input('선택: ').strip()
            if choice=='q':return
            if choice=='0':break
            if not choice.isdigit() or not 1<=int(choice)<=len(names):continue
            try:install(names[int(choice)-1])
            except (RuntimeError,OSError,subprocess.CalledProcessError) as exc:print('설치 실패:',exc,'\nREADME.md의 모델별 준비 사항을 확인해주세요.')
    if args.command=='install':
        if not args.model: parser.error('설치할 모델 ID가 필요합니다.')
        install(args.model); return
    if args.command=='doctor':
        for m in ([args.model] if args.model else MODELS): print(m, availability(m))
        return
    service=Service()
    threading.Thread(target=service.refresh,daemon=True).start()
    server=ThreadingHTTPServer(('127.0.0.1',PORT),handler(service))
    print('BOTTOPIA PC 연결기 · 이 컴퓨터에서만 접근 가능\n웹사이트의 연결 코드 칸에 입력:\n'+service.token,flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: service.close();server.server_close()


if __name__=='__main__': main()
