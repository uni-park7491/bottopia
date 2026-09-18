import base64
import http.client
import io
import json
import os
from pathlib import Path
import shutil
import threading
import time
import unittest
import wave
from unittest.mock import patch
import connector as c


def request(model='piper'):
    return dict(model=model,text='Hello from Bottopia. This is a real local speech test.',language=c.LANGUAGES[model][0],voice=c.VOICES.get(model,['default'])[0],consent=True,instruct='A calm female voice.')


def reference():
    out=io.BytesIO()
    with wave.open(out,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(bytes(48000))
    return base64.b64encode(out.getvalue()).decode()


class Validation(unittest.TestCase):
    def test_all_16_desktop_variants_have_real_dispatch(self):
        source=(c.ROOT/'runner.py').read_text()
        self.assertEqual(len(c.MODELS),16)
        for model in c.MODELS:
            self.assertIn("'"+model+"'",source)
            p=request(model)
            if model in c.REFERENCE_REQUIRED:p.update(reference=reference(),reference_text='Reference transcript')
            self.assertEqual(c.validate(p)['model'],model)

    def test_reject_commands_paths_unknown_models_and_invalid_values(self):
        for change in [{'command':'id'},{'reference_path':'/etc/passwd'},{'model':'../../x'},{'speed':float('nan')},{'speed':True},{'text':'x'*501},{'consent':False},{'language':'invalid'},{'voice':'../../model'}]:
            with self.subTest(change=change),self.assertRaises(ValueError):c.validate({**request(),**change})

    def test_reference_validation(self):
        with self.assertRaises(ValueError):c.validate(request('cosyvoice'))
        with self.assertRaises(ValueError):c.validate({**request('voxcpm'),'reference':'https://evil.test/a.wav'})
        with self.assertRaises(ValueError):c.validate({**request(),'reference':reference()})
        self.assertTrue(c.validate({**request('voxcpm'),'reference':reference()})['_reference_bytes'])

    def test_origin_token_host_and_no_install_endpoint(self):
        service=c.Service(token='test-only-token')
        server=c.ThreadingHTTPServer(('127.0.0.1',0),c.handler(service))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            for host,origin,token,expected in [
                (f'127.0.0.1:{c.PORT}','https://bottopia.studio','test-only-token',200),
                (f'127.0.0.1:{c.PORT}','https://evil.test','test-only-token',403),
                (f'127.0.0.1:{c.PORT}','https://bottopia.studio','wrong',403),
                ('evil.test','https://bottopia.studio','test-only-token',403),
                (f'127.0.0.1:{c.PORT}','null','test-only-token',403),
            ]:
                conn=http.client.HTTPConnection('127.0.0.1',server.server_port)
                conn.request('GET','/v1/models',headers={'Host':host,'Origin':origin,'Authorization':'Bearer '+token})
                response=conn.getresponse();self.assertEqual(response.status,expected);response.read();conn.close()
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port)
            conn.request('POST','/install',body='{}',headers={'Host':f'127.0.0.1:{c.PORT}','Origin':'https://bottopia.studio','Authorization':'Bearer test-only-token','Content-Type':'application/json'})
            self.assertEqual(conn.getresponse().status,404);conn.close()
        finally:server.shutdown();server.server_close()

    def test_cancel_before_spawn_and_missing_install_never_succeed(self):
        service=c.Service()
        with patch.object(c,'environment',return_value=Path('/nonexistent/bottopia-test-python')):
            key=service.create(c.validate(request()))
            for _ in range(100):
                if service.jobs[key]['state']=='error':break
                time.sleep(.01)
            self.assertEqual(service.jobs[key]['state'],'error')
            self.assertFalse((service.jobs[key]['directory']/'output.wav').exists())
        service.close()
        for j in service.jobs.values():shutil.rmtree(j['directory'])

    @unittest.skipUnless(os.environ.get('BOTTOPIA_REAL_TTS_TEST')=='1','Explicit real model download/inference test')
    def test_real_piper_synthesis(self):
        service=c.Service();key=service.create(c.validate(request()))
        try:
            deadline=time.time()+300
            while service.jobs[key]['state'] in ('queued','running') and time.time()<deadline:time.sleep(1)
            job=service.jobs[key]
            self.assertEqual(job['state'],'done',str(job))
            with wave.open(str(job['directory']/'output.wav'),'rb') as wav:
                self.assertEqual(wav.getframerate(),24000)
                self.assertGreater(wav.getnframes(),24000)
                frames=wav.readframes(wav.getnframes());self.assertTrue(any(frames))
            print('REAL PIPER VERIFIED:',job['seconds'],'seconds;',job['directory']/'output.wav')
        finally:service.close()


if __name__=='__main__':unittest.main()
