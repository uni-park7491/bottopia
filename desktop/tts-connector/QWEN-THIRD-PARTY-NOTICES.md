# Qwen 연결기 소스 배포 고지

검토일: 2026-09-18. 범위: BOTTOPIA 연결기 소스 + 사용법 + 라이선스 문서.

## 저작권과 라이선스

- BOTTOPIA 연결기 코드는 동봉한 MIT LICENSE를 따릅니다.
- Qwen3-TTS: Copyright 2026 Alibaba Cloud. Apache License 2.0.
- qwen-tts 0.1.1 wheel의 라이선스 전문을 `licenses/Qwen-Apache-2.0.txt`에 보존했습니다. 해당 wheel에는 별도 NOTICE 파일이 없었습니다.
- API 호출 예제를 BOTTOPIA의 로컬 서버·언어 선택·오디오 저장 방식에 맞게 구성했습니다. 이는 Qwen의 공식 배포 앱이나 보증·제휴를 뜻하지 않습니다.
- 공식 CustomVoice / VoiceDesign 모델 카드의 라이선스 표시는 Apache-2.0입니다. 검토한 리비전과 패키지 SHA-256은 `qwen-release.json`에 있습니다.

## 포함하는 것과 포함하지 않는 것

이 ZIP에는 제3자 Python 패키지, 모델 가중치, 음성 데이터, 실행 환경 바이너리가 없습니다. Python 설치 후 사용자가 설치 메뉴를 실행하면 PyPI에서 패키지를 받으며, 첫 생성 시 고정된 공식 Hugging Face 모델 스냅샷을 받습니다. 해당 스냅샷 안의 speech_tokenizer도 함께 사용합니다.

외부 의존성을 묶어 재배포하는 설치 앱에 대한 검토는 아닙니다. 간접 의존성은 사용자 OS에 따라 달라지며 모두의 버전·라이선스를 확정한 잠금 파일은 아직 없습니다. 설치된 패키지의 원래 라이선스·고지를 유지해야 합니다. 이 자료를 근거로 엔진/모델을 추가로 번들링하거나 전체 모델 계열이 검토됐다고 표시하면 안 됩니다.

## 직접 설치되는 주요 패키지의 공식 출처

qwen-tts 0.1.1의 Requires-Dist: transformers==4.57.3, accelerate==1.12.0, gradio, librosa, torchaudio, soundfile, sox, onnxruntime, einops. 연결기는 soundfile 및 scipy도 사용합니다. PyTorch 등 간접 의존성은 설치 도구가 해결합니다. 이 목록은 전체 SBOM이 아닙니다.

- https://pypi.org/project/qwen-tts/0.1.1/
- https://github.com/QwenLM/Qwen3-TTS
- https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice/tree/0c0e3051f131929182e2c023b9537f8b1c68adfe
- https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign/tree/5ecdb67327fd37bb2e042aab12ff7391903235d3

## 이용 시 주의

Apache 2.0은 제3자의 상표·개인정보·목소리 사용 권한을 대신 부여하지 않습니다. 타인의 사칭이나 동의 없는 사용을 허용한다는 뜻이 아닙니다. 기준 텍스트와 결과물 사용 권한은 별도로 확인해야 합니다.

라이선스 고지를 갖춘 소스 배포와 실제 기기 호환성 검증은 별개입니다. 전체 Mac·Windows 음성 생성 검증은 완료되지 않았으며, 서명·Apple 공증도 없는 소스 ZIP입니다.
