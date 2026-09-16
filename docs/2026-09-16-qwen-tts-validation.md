# Qwen3-TTS integration validation

## Scope

User-selectable, visitor-device Qwen3-TTS alongside Supertonic 3. Downloads are opt-in. No paid inference API, operator GPU server, uploaded text, or voice-cloning feature.

## Reproducible components

- llama-web-bridge-assets v0.1.44; release SHA-256 checks verified.
- ggml-org Qwen3-TTS-12Hz-1.7B-Base-GGUF revision ca27d74bc954b73dadab5b71ca265d87fc861a7c.
- Model SHA-256 8d18c94acb2addd042f97da63c98be144eafa76d0d9495177eab65130cf85129.
- Projector SHA-256 6fd65188839bcd6ecc91b277ad471e22a0edfada4699a0fe82f1165c18cfcce2.
- Exact downloaded model and projector checksums verified locally.

## Browser test 1 — isolated engine harness

- Chrome, WebGPU/CPU backend, memory64, COOP/COEP enabled.
- Input: `안녕하세요. 봇토피아입니다.`
- Real synthesis: success; 1.84 seconds; 24,000 Hz mono, peak 0.2372.
- Total model loading plus inference time: 187.38 seconds (local model HTTP source).
- Browser audio entered playing state after clicking Play.
- WAV downloaded to the local Downloads folder; ffprobe confirmed pcm_s16le, 24kHz, mono, 88,364 bytes, 1.84 seconds.
- Independent local Whisper base transcription: `안녕하세요, 보도피아입니다.` This supports intelligibility, not an exact-pronunciation or listening-quality guarantee; the brand proper noun was transcribed differently.

## Application-specific checks

- Qwen runs on member-protected `/tools/tts?model=qwen`.
- COOP/COEP limited to `/tools/tts?model=qwen` and Qwen vendor assets; OAuth routes and Supertonic are unchanged. Applying isolation to Supertonic caused a worker startup failure during regression testing; query-scoped isolation fixed it and real synthesis was rerun successfully.
- TTS engine selection requires full document navigation to establish isolation.
- Download opt-in, running-state controls, cancellation and retry verified in the application UI.
- Empty, malformed, silent and truncated audio are rejected, tested with mocked engine outputs (not claimed as real inference tests).
- Existing Supertonic selection retained.
- Automated suite: 164 passing tests; scoped ESLint and production build passed.

## Browser test 2 — actual member-protected application

- URL: `http://127.0.0.1:3001/tools/tts?model=qwen`.
- Input: `안녕하세요. 봇토피아에서 이야기를 시작합니다.`
- Downloads from the pinned Hugging Face URLs completed, including visible download progress and Cache Storage persistence.
- Generation completed. Native browser audio entered playing state; the application's WAV download button saved a real file.
- ffprobe: PCM16, 24kHz, mono, 2.96 seconds, 142,124 bytes.
- Local Whisper base transcription: `안녕하세요, 포토피아에서 이야기를 시작합니다`. Again, the proper noun differed; no claim of perfect pronunciation.
- Existing Supertonic regression: same page with `model=supertonic` generated, played and downloaded PCM16 mono 44.1kHz, 3.124649 seconds, 275,638 bytes.
- Second Qwen application generation: `오늘은 새로운 이야기를 함께 만들어 봅시다.` Model/decoder cache reused, completed with 4.3-second preview, played and downloaded successfully. Prior result remained available while generation was running.
