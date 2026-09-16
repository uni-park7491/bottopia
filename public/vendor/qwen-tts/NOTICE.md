# Qwen3-TTS browser runtime

- Model: Qwen3-TTS-12Hz-1.7B-Base, Apache-2.0, https://github.com/QwenLM/Qwen3-TTS
- GGUF conversion: https://huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF/tree/ca27d74bc954b73dadab5b71ca265d87fc861a7c
- Runtime: llama-web-bridge v0.1.44, MIT, https://github.com/leehack/llama-web-bridge
- Runtime source revision: 89178be67c3c84300bc1b129182bd5bc5a8e21fc
- Built llama.cpp revision: b29c606e28a01b1bc8c1351026a0fa6e616bf6c4 (MIT)
- The release manifest and checksums are included. BOTTOPIA's worker adapter is separate from upstream runtime assets.
- Model SHA-256: 8d18c94acb2addd042f97da63c98be144eafa76d0d9495177eab65130cf85129
- Projector SHA-256: 6fd65188839bcd6ecc91b277ad471e22a0edfada4699a0fe82f1165c18cfcce2

Inference runs on the visitor's device. No hosted inference API or voice cloning is provided. Downloads contact Hugging Face; entered text/audio is not sent there. Downloads total approximately 1.48GB (decimal), excluding runtime memory. Browser cache may be evicted by the browser. Apache-2.0 is not a grant of rights to impersonate people or use others' protected material.
