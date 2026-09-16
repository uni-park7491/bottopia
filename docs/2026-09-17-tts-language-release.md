# TTS language selection release

## Implemented

- Retain local-only Supertonic 3 and Qwen3-TTS Base 1.7B. No paid API or credentials added.
- Expose each pinned engine's supported language allowlist: Supertonic 31; Qwen 10.
- Pass the selected language into actual inference, not just UI labels.
- Reject unsupported language values before model download in both workers.
- Keep text/audio when switching engines; reset language with an explicit notice only if the next engine does not support it.
- Keep generated audio's engine/language metadata separate from current selection.
- Explain purpose, approximate model download size, extra runtime/cache space, cache eviction, local execution, and WAV saving.

## Validation

- 172 automated tests pass. Language routing for all exposed codes tested with mocked inference; these are not acoustic quality tests.
- Production build and modified TSX lint pass.
- Browser: Supertonic English generated a 2.7-second clip, playback entered playing state, WAV download requested.
- Browser: Qwen English generated a 2.0-second clip, playback entered playing state, WAV download requested. Unsupported Chinese → Supertonic switch reset language to Korean with a visible notice and preserved the Qwen result.

## Not complete

The broader request to integrate all surveyed models is not fulfilled by this release. CustomVoice, VoiceDesign, VoxCPM2, CosyVoice, Chatterbox, OmniVoice, Kokoro and other engines are not connected or advertised as usable.
The vendored Qwen native bridge exposes language and speakerAudio but does not expose CustomVoice speaker IDs or VoiceDesign instruction inputs. Supporting those requires a different inference integration, not additional UI choices. No unsupported model buttons have been published.
No claim is made that every listed language has been listened to or quality-tested.
