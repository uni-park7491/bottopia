// macOS-only, offline temporary narration. No API, shell interpolation or server.
// Apple System Voices are for personal, non-commercial use, not public sharing.
// https://www.apple.com/legal/sla/docs/macOSTahoe.pdf section 2.F.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, stat, access, mkdtemp, copyFile, unlink, rmdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const run = promisify(execFile);
export function narrationOptions(args) {
  if (args.length < 2 || args.length > 5) throw new Error('사용법: node local-narration.mjs 입력.txt 출력.wav [목소리=Yuna] [속도=160] [엔진=system|espeak-ng]');
  const [input, output, voice = 'Yuna', speed = '160', engine = 'system'] = args;
  if (!['system', 'espeak-ng'].includes(engine)) throw new Error('지원하지 않는 음성 엔진입니다.');
  if (engine === 'espeak-ng' && !['ko', 'en'].includes(voice)) throw new Error('eSpeak NG는 한국어 ko 또는 영어 en을 선택해주세요. 추가 음성 모델은 사용하지 않습니다.');
  if (!input.toLowerCase().endsWith('.txt') || !output.toLowerCase().endsWith('.wav') || resolve(input) === resolve(output)) throw new Error('입력은 TXT, 새 출력은 WAV 파일이어야 합니다.');
  if (!voice.trim() || voice.length > 80 || /[\r\n\0]/.test(voice)) throw new Error('목소리 이름을 확인해주세요.');
  const rate = Number(speed);
  if (!Number.isInteger(rate) || rate < 80 || rate > 260) throw new Error('속도는 80–260 사이 정수입니다.');
  return { input: resolve(input), output: resolve(output), voice, rate, engine };
}
async function espeakBinary() {
  // Only conventional package-manager locations, never a caller-supplied path.
  for (const binary of ['/opt/homebrew/bin/espeak-ng', '/usr/local/bin/espeak-ng', '/usr/bin/espeak-ng']) {
    try { await access(binary, constants.X_OK); return binary; } catch { /* try next */ }
  }
  throw new Error('eSpeak NG를 먼저 설치해주세요. Homebrew가 설치된 Mac에서는 brew install espeak-ng 로 설치합니다. 도구는 자동 설치하지 않습니다.');
}
async function writeSpeech(binary, args, text) {
  await new Promise((done, reject) => {
    const child = execFile(binary, args, { timeout: 180000 }, error => error ? reject(error) : done());
    child.stdin.on('error', () => {}); child.stdin.end(text);
  });
}
export async function narrate(args) {
  if (process.platform !== 'darwin') throw new Error('이 버전은 macOS 전용입니다. Windows/Linux 지원을 가장하지 않습니다.');
  const options = narrationOptions(args);
  const info = await stat(options.input);
  if (!info.isFile() || info.size > 12000) throw new Error('12KB 이하 텍스트 파일을 선택해주세요.');
  const text = await readFile(options.input, 'utf8');
  if (!text.trim() || text.length > 3000 || text.includes('\0')) throw new Error('내용은 1–3000자까지 지원합니다.');
  let binary;
  if (options.engine === 'system') {
    console.warn('개인·비상업적 미리듣기 전용. Apple 시스템 음성이 포함된 파일을 공개 피드·SNS·포트폴리오에 공유하지 마세요. 사용권: https://www.apple.com/legal/sla/docs/macOSTahoe.pdf (2.F)');
    const listed = await run('/usr/bin/say', ['-v', '?'], { timeout: 10000 });
    const voices = listed.stdout.split('\n').map(line => line.match(/^(.*?)\s+[a-z]{2}_[A-Z]{2}\s+#/)?.[1].trim()).filter(Boolean);
    if (!voices.includes(options.voice)) throw new Error('이 기기에 없는 목소리입니다. macOS 설정에서 목소리를 설치한 뒤 다시 실행해주세요. 자동 다운로드하지 않습니다.');
  } else binary = await espeakBinary();
  const temporary = await mkdtemp(join(tmpdir(), 'bottopia-narration-'));
  const aiff = join(temporary, 'speech.aiff'); const wav = join(temporary, 'speech.wav');
  try {
    if (binary) {
      await writeSpeech(binary, ['--stdin', '-b', '1', '-v', options.voice, '-s', String(options.rate), '-w', wav], text);
    } else {
      await writeSpeech('/usr/bin/say', ['-v', options.voice, '-r', String(options.rate), '-o', aiff], text);
      await run('/usr/bin/afconvert', [aiff, wav, '-f', 'WAVE', '-d', 'LEI16@44100'], { timeout: 30000 });
    }
    // Never overwrite an existing user file, including an existing symlink.
    await copyFile(wav, options.output, constants.COPYFILE_EXCL);
    return options.output;
  } finally {
    await Promise.all([aiff, wav].map(file => unlink(file).catch(() => {})));
    await rmdir(temporary).catch(() => {});
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  narrate(process.argv.slice(2)).then(file => console.log(`로컬 음성 저장 완료: ${file}`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
