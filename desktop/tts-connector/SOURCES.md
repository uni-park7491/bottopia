# Adapter references checked 2026-09-18

- Qwen custom/design: https://github.com/QwenLM/Qwen3-TTS — Python Package Usage
- VoxCPM2: https://github.com/OpenBMB/VoxCPM — generate/reference_wav_path
- CosyVoice3: https://github.com/FunAudioLLM/CosyVoice/blob/main/example.py — cosyvoice3_example
- Chatterbox: https://github.com/resemble-ai/chatterbox/blob/master/src/chatterbox/mtl_tts.py
- OmniVoice: https://github.com/k2-fsa/OmniVoice — Python quickstart
- GPT-SoVITS: https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py — TTS_Config/TTS.run and request fields
- MeloTTS: https://github.com/myshell-ai/MeloTTS/blob/main/docs/install.md
- Bark: https://github.com/suno-ai/bark — generate_audio
- Pocket: https://github.com/kyutai-labs/pocket-tts — TTSModel; language selection in pocket_tts/models/tts_model.py
- Orpheus: https://github.com/canopyai/Orpheus-TTS — OrpheusModel.generate_speech
- Parler: https://huggingface.co/parler-tts/parler-tts-mini-v1
- Dia: https://github.com/nari-labs/dia/blob/main/example/simple.py
- CSM: https://github.com/SesameAILabs/csm — load_csm_1b/Segment
- StyleTTS2: https://github.com/yl4579/StyleTTS2 — links the separate PyPI implementation; https://pypi.org/project/styletts2/ (inference API). This is not the same phonemizer as the original notebook.
- Piper: https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md

Package versions and source commits are recorded in catalog.py. Recipe/API implementation is not evidence that every model has been synthesized on every supported platform. The automated real-model test currently exercises Piper; additional validation must be reported separately.
