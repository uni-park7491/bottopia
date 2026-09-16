# Qwen browser voice presets

## Implementation

- Keep the pinned Qwen3-TTS 1.7B Base model and v0.1.44 runtime. The browser bridge does not expose CustomVoice's `speaker` or VoiceDesign's `instruct` API.
- Use the runtime's supported `speakerAudio` conditioning with two bundled synthetic reference WAVs. The final synthesis remains Qwen, not Supertonic or pitch-shifted audio.
- F1/M1 reference voices were generated using existing Supertonic 3 locally in Chrome, then converted to 24 kHz mono PCM16. No human voice recording or new paid service is used.
- Reference text and source model/license are documented in `public/vendor/qwen-tts/NOTICE.md`.
- Validate the voice ID before model download. Only fixed same-origin files are accepted. Check WAV container and size; fail clearly if the projector lacks speaker-reference support. Every text chunk receives the same selected reference.
- UI exposes female/male for both engines. Qwen speed and free-form acting controls are not advertised. Preview records the voice used to create the result.

## Reference fingerprints

- F1: `7e9c69be3918ac8128bcd3ef33030e753555020026cb000a8b050c6248aa2bcf`, 9.466 seconds.
- M1: `e3e74da90dafc9c2143903f69ac31e512983b5fce2f751661ca8198cd094999e`, 9.476 seconds.

## Automated checks

- 167 tests pass, including both voice IDs reaching every synthesized chunk, invalid voices, unsupported reference capability, failed reference downloads, malformed WAV and distinct bundled files.
- Production build passes; TypeScript passes.

## Real Chrome integration

- Local member route `/tools/tts?model=qwen`; both references accepted by the actual pinned model/projector. Same input: 오늘은 새로운 이야기를 함께 만들어 봅시다.
- M1: 3.52 s, 24 kHz mono PCM16 WAV, SHA-256 `735b9f976f0b6d36c8f4ef4e4f172a1cbbe80142df46916723a0eaa81a986baa`.
- F1: 4.16 s, 24 kHz mono PCM16 WAV, SHA-256 `f5201b00b1a8f0727f30c55878ef229b302fdf4492e5598f1babbd61eeb8d781`.
- Both browser audio players entered playing state; both WAVs downloaded. Local Whisper base transcription matched the input sentence for both, apart from spacing.
- Changing the selector after F1 generation leaves the preview labelled as the F1 result, rather than relabelling existing audio.
- F0 measurements alone do not establish perceived gender or faithful cloning. The result medians were approximately 147 Hz (M1) and 136 Hz (F1), versus reference medians 139 and 198 Hz. Thus do not claim a guaranteed gender/voice match, validated speaker identity, or CustomVoice-quality presets. The UI describes synthetic **reference** voices and approximate matching.
- Actual synthesis was tested on local Chrome, not on every browser/device. Model execution is slow on this device; installation/download size is not treated as a reason to block use.

## Model distinction

Qwen3-TTS is the family name. Base supports reference-audio conditioning; CustomVoice 1.7B provides nine named voice presets and style instructions; VoiceDesign 1.7B accepts a description to design a voice. This change does not claim either of the latter two models is connected.

Official references: https://github.com/QwenLM/Qwen3-TTS and https://github.com/leehack/llama-web-bridge/blob/main/docs/api.md .
