# BOTTOPIA Qwen 연결기 — 소스 배포

포함 모델: Qwen3-TTS CustomVoice 1.7B / VoiceDesign 1.7B만.
일반 16모델 연결기와 다른 제한 배포본입니다. 다른 모델 설치 메뉴는 없습니다.

## 사용 순서

실행 경로가 `.Trash` 또는 `.Trashes`이면 휴지통 안에서 실행한 것입니다. Finder에서 폴더를 ‘다시 넣기’로 복원하거나 ZIP 전체를 다운로드 폴더에 새로 풀어주세요. `Operation not permitted`를 해결하려고 터미널 전체 디스크 접근이나 보안 해제를 설정하지 마세요. 수정된 시작 파일은 이 경우 실행 전에 복원 안내를 표시합니다.

1. ZIP을 풀고 Python 3.11을 https://www.python.org/downloads/ 에서 설치합니다.
2. Mac: `Start-Mac.command` / Windows: `Start-Windows.cmd` 실행. Python 실행 명령을 찾을 수 없다면 터미널에서 이 폴더로 이동한 후 Mac `python3.11 connector.py menu`, Windows `py -3.11 connector.py menu`를 실행합니다.
3. 메뉴에서 원하는 모델 번호를 입력합니다. 외부 Python 패키지를 내려받으므로 인터넷 연결·저장 공간이 필요합니다.
4. 설치가 끝나면 0을 입력합니다. 표시된 연결 코드를 홈페이지의 PC 연결 코드에 붙여넣습니다. 실행 창을 열어두세요.
5. 첫 음성 생성 시 공식 모델 파일을 추가로 내려받습니다. 모델 및 실행 환경은 수 GB 이상을 사용할 수 있고 생성 속도는 하드웨어에 따라 다릅니다.

CLI: `python3.11 connector.py install qwen-custom` 또는 `qwen-design`, 이후 `python3.11 connector.py serve`. Windows는 `python3.11` 대신 `py -3.11`.

CustomVoice는 목소리·대사·말투를, VoiceDesign은 목소리 설명과 대사를 입력합니다. API 결제 키는 필요하지 않습니다. 모바일 단독 실행은 지원하지 않습니다.

## 삭제 방법

Mac·Windows별 설치 환경·모델 캐시·연결 코드 삭제 방법은 [UNINSTALL.md](UNINSTALL.md)를 확인하세요. ZIP만 지우면 설치한 모델과 실행 환경은 남습니다.

## 라이선스 범위

`QWEN-THIRD-PARTY-NOTICES.md`, `LICENSE`, `licenses/Qwen-Apache-2.0.txt`와 버전 기록 `qwen-release.json`을 확인하세요. ZIP에는 가중치나 제3자 실행 바이너리가 없습니다. 소스 배포 고지를 갖췄다는 뜻이지, 모든 간접 의존성의 법률 검토나 권리 보증을 뜻하지 않습니다. 엔진·모델을 묶는 설치 앱으로 재배포하려면 추가 검토가 필요합니다.

## 실행 및 보안 상태

전체 Mac·Windows의 실제 음성 생성 검증은 완료되지 않았습니다. 연결기 로직·패키지 구성 테스트와 모델 추론 테스트는 별개입니다.

이 소스는 Apple Developer ID 서명·공증이나 Windows 코드 서명을 받은 설치 앱이 아닙니다. 보안 경고가 표시될 수 있습니다. 다운로드 출처와 파일을 확인하세요. 악성 코드 탐지·손상·조직 정책 차단이면 실행을 중단하세요. 보안 기능을 끄거나 격리 속성을 일괄 제거하지 마세요.

- Mac 공식 안내: https://support.apple.com/102445
- Windows 공식 안내: https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation

연결기는 이 컴퓨터의 127.0.0.1에서만 열립니다. 연결 코드를 공유하지 마세요. 대사와 생성 요청은 이 컴퓨터의 연결기로 전달됩니다. 설치·최초 생성에는 PyPI 및 Hugging Face 다운로드 통신이 발생합니다.
