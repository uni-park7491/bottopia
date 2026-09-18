# BOTTOPIA PC TTS 연결기

홈페이지에서 선택한 모델을 자신의 PC에서 실행합니다. 유료 추론 API는 사용하지 않습니다. 모델 다운로드에 네트워크와 저장 공간이 필요하고, 생성에는 CPU/GPU와 메모리가 필요합니다. 이 ZIP에는 모델 가중치가 포함되어 있지 않습니다.

이 다운로드는 BOTTOPIA 연결기 소스와 16개 PC 설치 항목을 제공합니다. 타사 모델·패키지·음성의 재배포본이나 모든 모델의 라이선스/실행 검증 완료판이 아닙니다. 설치 시 각 공식 출처에서 별도로 받으며 접근 승인이 필요한 모델은 사용자 본인이 승인받아야 합니다. 모델별 조건은 홈페이지와 SOURCES.md의 공식 문서를 확인하세요. Qwen 전용 고지와 qwen-release.json은 Qwen 두 항목에만 해당합니다.

## 설치와 실행

### 실행 전 보안 경고

이 파일은 서명·공증된 설치 앱이 아닌 소스 배포입니다. 다운로드한 실행 스크립트가 운영체제에서 차단될 수 있습니다. Windows 실제 설치 검증은 아직 완료되지 않았습니다.

- Mac: “Apple은 악성 코드가 없음을 확인할 수 없습니다”는 개발자 확인·공증 관련 경고이며, 악성 코드 검출과는 다릅니다. 안전하다는 보장도 아닙니다. 우선 ‘완료’를 누르고 다운로드 출처와 파일을 확인하세요. 신뢰할 수 있다고 판단한 경우에만 시스템 설정 → 개인정보 보호 및 보안에서 정확한 파일을 확인하고 ‘확인 없이 열기’(Open Anyway)로 개별 승인할 수 있습니다. 항목이 없거나 악성 코드 탐지·손상 경고라면 중단하세요. 공식 안내: https://support.apple.com/102445
- Windows: 환경에 따라 SmartScreen 또는 Smart App Control에서 차단할 수 있습니다. 파일 종류·정책에 따라 화면과 허용 여부가 다릅니다. 출처와 검사 결과를 확인하고, 악성 코드 탐지·조직 정책 차단이 있으면 실행하지 마세요. 공식 안내: https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation
- Gatekeeper·SmartScreen·백신·방화벽을 끄거나 격리 속성을 일괄 제거하지 마세요. 실행 승인은 사용자가 직접 판단해야 합니다.

Python/Git 설치 후 Mac은 `Start-Mac.command`, Windows는 `Start-Windows.cmd`를 실행하면 모델 선택 메뉴가 열립니다. 번호를 골라 설치하고, 0을 선택하면 홈페이지 연결을 시작합니다. 아래는 터미널에서 직접 실행하는 방법입니다.

1. https://www.python.org/downloads/ 에서 모델에 필요한 Python을 설치하고 https://git-scm.com/downloads 에서 Git을 설치합니다. 서로 다른 모델은 별도 가상환경에 설치되므로 의존성을 공유하지 않습니다.
2. 터미널에서 ZIP을 푼 폴더로 이동합니다.
3. `python3.11 connector.py install piper`처럼 모델 하나를 설치합니다. Windows에서는 `py -3.11 connector.py install piper`를 사용합니다. Python 3.10 모델은 해당 버전으로 명령을 바꿉니다.
4. `python3.11 connector.py serve`로 실행합니다. 연결기 자체는 Python 3.10 이상이면 됩니다.
5. 터미널에 표시되는 연결 코드를 BOTTOPIA TTS의 **PC 연결 코드**에 붙여넣고 연결 확인을 누릅니다. 연결 코드는 프로그램을 재시작할 때마다 바뀝니다. 타인에게 공유하지 마세요.
6. 설치 환경 검사가 완료되면 생성 버튼이 활성화됩니다. 최초 생성 중 모델 파일이 추가 다운로드됩니다. 환경 검사 통과는 실제 생성 품질 검증과 다릅니다.

브라우저에서 로컬 네트워크 접근 권한을 물으면 BOTTOPIA의 이 연결에만 허용하세요. 연결기는 `127.0.0.1:47831`에만 열리며 공유기 포트 개방, 방화벽 해제, 외부 터널은 필요 없습니다. 모바일에서 PC를 원격 호출하는 기능은 제공하지 않습니다.

## 설치 모델 ID

| 모델 ID | Python | 연결 기능 / 별도 준비 |
|---|---|---|
| qwen-custom | 3.11 | Qwen3 CustomVoice 1.7B, 9개 화자·감정 지시 |
| qwen-design | 3.11 | Qwen3 VoiceDesign 1.7B, 설명으로 목소리 생성 |
| voxcpm | 3.11 | VoxCPM2, 설명·기준 음성 |
| cosyvoice | 3.10 | CosyVoice3, 기준 음성·대사·지시. 공식 저장소 및 가중치 설치 |
| chatterbox | 3.11 | Multilingual, 기준 음성. 생성 음성 워터마크 유지 |
| omnivoice | 3.11 | 설명 또는 기준 음성, 속도 |
| gpt-sovits | 3.10 | 공식 사전 학습 모델과 설정 준비가 추가로 필요 (아래 참고) |
| melo | 3.10 | 언어별 기본 낭독·속도, UniDic 다운로드 |
| bark | 3.11 | 언어별 음성 프리셋 0–9, 표현 태그 |
| pocket | 3.11 | CPU, 공식 6개 언어 기본 음성·기준 음성 |
| orpheus | 3.10 | Linux/WSL + 지원 NVIDIA CUDA GPU/vLLM 필요. 모델 접근 승인 필요 가능 |
| parler | 3.11 | 영어, 목소리·녹음 분위기 설명 |
| dia | 3.11 | 영어 두 화자 대화·비언어 표현 |
| csm | 3.10 | 영어 화자·이전 음성 맥락. CSM/Llama 접근 승인 필요 |
| styletts | 3.10 | 공식 README가 소개한 별도 styletts2 Python 패키지. 발음 처리 방식 차이 있음 |
| piper | 3.11 | CPU, en_US-lessac-medium. 현재 연결기의 기본 음성은 이 한 종 |

Supertonic3, Qwen3 Base, Kokoro는 홈페이지의 브라우저 실행 연결을 그대로 사용합니다. 17개 계열과 Qwen 3가지 변형을 합쳐 19개 선택 항목입니다.

## 특수 모델 준비

- GPT-SoVITS: https://github.com/RVC-Boss/GPT-SoVITS 의 **Installation / Pretrained Models** 절차로 공식 가중치를 다운로드해 `~/.bottopia-tts/gpt-sovits/source/GPT_SoVITS/pretrained_models`에 배치합니다. 해당 저장소의 `GPT_SoVITS/configs/tts_infer.yaml`에 사용할 모델 경로·기기를 설정하세요. 설치기가 임의의 사용자 체크포인트를 고르거나 덮어쓰지 않습니다. Windows의 `~`는 사용자 홈 폴더입니다.
- CosyVoice: 설치기는 공식 Fun-CosyVoice3-0.5B-2512를 내려받습니다. ffmpeg/컴파일 도구 등 OS 의존성 오류는 공식 설치 문서를 확인하세요.
- CSM/Orpheus: 가중치 접근 승인은 사용자가 Hugging Face에서 직접 진행해야 합니다. 연결기에서 승인 우회나 타인의 토큰 사용은 하지 않습니다. 필요 시 해당 가상환경에서 `hf auth login`을 실행하세요. 이 토큰을 홈페이지에 입력하지 마세요.
- StyleTTS2: PyPI 패키지의 발음 처리와 원본 논문 구현은 다릅니다. 모델 사용 조건과 합성 음성 공개 표시 조건을 확인하세요.
- Orpheus는 이 Mac용 CPU 대체 구현을 포함하지 않습니다. 지원 GPU가 없는 PC에서는 환경 검사에 실패하도록 되어 있습니다.

## 동작 및 제한

- 한 번에 작업 하나, 대사 500자, 출력 최대 180초, 작업 제한 30분.
- 기준 음성은 브라우저에서 PCM16 mono 24kHz WAV로 변환한 뒤 이 컴퓨터에만 전송됩니다. 1–60초/입력 10MB 이하. 본인 또는 허락받은 목소리만 사용하세요.
- 생성된 WAV를 홈페이지 미리보기로 받고 WAV/MP3로 저장합니다.
- 결과는 임시 폴더에 저장됩니다. 다음 작업에서 오래된 결과를 정리합니다. 기준 음성과 입력 대사는 작업 종료 시 삭제합니다. PC 진단 로그에 모델 라이브러리가 입력을 기록할 가능성이 있으므로 민감한 대사를 쓰지 마세요.
- 홈페이지로 원시 실행 로그·PC 파일 경로를 반환하지 않습니다. 오류 시 터미널에 표시된 로컬 로그를 확인하세요.
- 중단 버튼은 해당 생성 프로세스를 종료합니다. 연결이 끊겼다면 PC 터미널에서 Ctrl+C로 연결기를 종료하세요.
- 설치 후 연결기를 재시작해야 설치 상태가 다시 검사됩니다.
- 모델을 모두 한 번에 설치할 필요는 없습니다. 원하는 모델만 설치합니다. 실제 용량·지원 하드웨어는 공식 모델 카드가 기준이며 이 버전은 모든 OS/GPU 조합의 생성 성공을 보증하지 않습니다.

## 삭제 방법

Mac·Windows별 삭제 절차는 [UNINSTALL.md](UNINSTALL.md)에 있습니다. 연결기 파일, 모델 실행 환경, 공유 모델 캐시, 브라우저 연결 정보는 서로 별개입니다.

## 검사

`python3.11 connector.py doctor piper`

`python3.11 test_connector.py -v` (보안·요청·연결 계약 검사)

`BOTTOPIA_REAL_TTS_TEST=1 python3.11 test_connector.py -v` (Piper 설치 후 실제 모델 다운로드·추론 검사)

## 보안

Origin/Host 허용 목록, 매 실행 무작위 연결 코드, 요청 크기 제한, 고정 모델 ID/설치 경로, 임의 명령·URL·파일 경로 거부. 웹 요청으로 패키지를 설치하지 않습니다. 설치는 PC에서 사용자가 명시적으로 실행합니다. Python 패키지와 모델 자체는 외부 프로젝트이므로 각 출처와 라이선스를 확인하세요.

## 출처 및 라이선스

연결기 코드는 MIT (LICENSE). 모델 코드·가중치 라이선스는 별도입니다. 설치기는 원 배포처에서 내려받으며 모델이나 upstream 소스를 ZIP에 재배포하지 않습니다. 주요 출처는 SOURCES.md에 기록되어 있습니다.
