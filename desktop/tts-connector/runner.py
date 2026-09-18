"""One subprocess per synthesis. APIs follow the upstream examples (see SOURCES.md)."""
import json
import os
from pathlib import Path
import sys
from catalog import MODELS

def progress(output, stage):
    target = Path(output).with_name('progress.json')
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps({'stage':stage}), encoding='utf-8')
    temporary.replace(target)


def device():
    import torch
    return 'cuda' if torch.cuda.is_available() else ('mps' if torch.backends.mps.is_available() else 'cpu')


def synthesize(p, output):
    progress(output, 'preparing')
    import numpy as np
    import soundfile as sf
    model_id, text, lang = p['model'], p['text'], p['language']
    if model_id not in MODELS:
        raise ValueError('Model is not included in this connector release')
    ref, instruct, speed = p.get('reference_path'), p.get('instruct', ''), p.get('speed', 1)
    voice = p.get('voice', '')
    transcript = p.get('reference_text', '')
    audio, sr = None, 24000
    if model_id in ('qwen-custom', 'qwen-design'):
        import torch
        from qwen_tts import Qwen3TTSModel
        from huggingface_hub import snapshot_download
        release = json.loads(Path(__file__).with_name('qwen-release.json').read_text(encoding='utf-8'))
        spec = release['models'][model_id]
        progress(output, 'downloading')
        snapshot = snapshot_download(spec['repo'], revision=spec['revision'])
        progress(output, 'loading')
        dev = device()
        model = Qwen3TTSModel.from_pretrained(snapshot, device_map=dev, dtype=torch.float32 if dev == 'cpu' else torch.float16, attn_implementation='sdpa')
        language = {'ko':'Korean','en':'English','ja':'Japanese','zh':'Chinese','de':'German','fr':'French','ru':'Russian','pt':'Portuguese','es':'Spanish','it':'Italian'}[lang]
        args = dict(text=text, language=language, instruct=instruct, max_new_tokens=2048)
        progress(output, 'generating')
        if model_id == 'qwen-custom':
            audio, sr = model.generate_custom_voice(**args, speaker=voice)
        else:
            audio, sr = model.generate_voice_design(**args)
        audio = audio[0]
    elif model_id == 'voxcpm':
        from voxcpm import VoxCPM
        model = VoxCPM.from_pretrained('openbmb/VoxCPM2', load_denoiser=False)
        args = dict(text=f'({instruct}){text}' if instruct else text, cfg_value=2, inference_timesteps=10)
        if ref: args['reference_wav_path'] = ref
        audio = model.generate(**args)
        sr = model.tts_model.sample_rate
    elif model_id == 'cosyvoice':
        import torch
        sys.path.insert(0, str(Path.cwd() / 'third_party/Matcha-TTS'))
        from cosyvoice.cli.cosyvoice import AutoModel
        model = AutoModel(model_dir='pretrained_models/Fun-CosyVoice3-0.5B')
        if instruct:
            chunks = model.inference_instruct2(text, 'You are a helpful assistant. ' + instruct + '<|endofprompt|>', ref, stream=False)
        else:
            chunks = model.inference_zero_shot(text, 'You are a helpful assistant.<|endofprompt|>' + transcript, ref, stream=False)
        audio = torch.cat([c['tts_speech'] for c in chunks], dim=-1).squeeze().cpu().numpy()
        sr = model.sample_rate
    elif model_id == 'chatterbox':
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        model = ChatterboxMultilingualTTS.from_pretrained(device=device())
        args = dict(language_id=lang, exaggeration=p.get('expression', .5))
        if ref: args['audio_prompt_path'] = ref
        audio = model.generate(text, **args).squeeze().cpu().numpy()
        sr = model.sr
    elif model_id == 'omnivoice':
        import torch
        from omnivoice import OmniVoice
        dev = device()
        model = OmniVoice.from_pretrained('k2-fsa/OmniVoice', device_map=dev, dtype=torch.float32 if dev == 'cpu' else torch.float16)
        args = dict(text=text, speed=speed)
        if ref: args.update(ref_audio=ref, ref_text=transcript)
        elif instruct: args['instruct'] = instruct
        audio = model.generate(**args)[0]
    elif model_id == 'gpt-sovits':
        sys.path.insert(0, str(Path.cwd() / 'GPT_SoVITS'))
        from GPT_SoVITS.TTS_infer_pack.TTS import TTS, TTS_Config
        model = TTS(TTS_Config('GPT_SoVITS/configs/tts_infer.yaml'))
        chunks = list(model.run(dict(text=text, text_lang=lang, ref_audio_path=ref, prompt_text=transcript, prompt_lang=p.get('reference_language', lang), text_split_method='cut5', batch_size=1, speed_factor=speed, streaming_mode=False, seed=42)))
        sr = chunks[0][0]
        audio = np.concatenate([chunk[1] for chunk in chunks])
        if audio.dtype == np.int16: audio = audio.astype(np.float32) / 32768
    elif model_id == 'melo':
        from melo.api import TTS
        code = {'ko':'KR','ja':'JP','zh':'ZH','en':'EN','fr':'FR','es':'ES'}[lang]
        model = TTS(language=code, device='cuda' if device() == 'cuda' else 'cpu')
        speakers = model.hps.data.spk2id
        speaker = speakers['EN-US'] if code == 'EN' else speakers[code]
        model.tts_to_file(text, speaker, str(output), speed=speed)
    elif model_id == 'bark':
        from bark import SAMPLE_RATE, generate_audio, preload_models
        preload_models()
        audio = generate_audio(text, history_prompt=f'v2/{lang}_speaker_{voice}')
        sr = SAMPLE_RATE
    elif model_id == 'pocket':
        from pocket_tts import TTSModel
        languages = {'en':'english','fr':'french_24l','de':'german_24l','pt':'portuguese','it':'italian','es':'spanish_24l'}
        defaults = {'en':'alba','fr':'estelle','de':'juergen','pt':'rafael','it':'giovanni','es':'lola'}
        model = TTSModel.load_model(language=languages[lang])
        state = model.get_state_for_audio_prompt(ref or defaults[lang])
        audio = model.generate_audio(state, text).detach().cpu().numpy()
        sr = model.sample_rate
    elif model_id == 'orpheus':
        import wave
        from orpheus_tts import OrpheusModel
        model = OrpheusModel(model_name='canopylabs/orpheus-tts-0.1-finetune-prod', max_model_len=2048)
        with wave.open(str(output), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000)
            for chunk in model.generate_speech(prompt=text, voice=voice): w.writeframes(chunk)
    elif model_id == 'parler':
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer
        dev = device()
        model = ParlerTTSForConditionalGeneration.from_pretrained('parler-tts/parler-tts-mini-v1').to(dev)
        tokenizer = AutoTokenizer.from_pretrained('parler-tts/parler-tts-mini-v1')
        description = tokenizer(instruct, return_tensors='pt').to(dev)
        prompt = tokenizer(text, return_tensors='pt').to(dev)
        audio = model.generate(input_ids=description.input_ids, attention_mask=description.attention_mask, prompt_input_ids=prompt.input_ids, prompt_attention_mask=prompt.attention_mask).cpu().numpy().squeeze()
        sr = model.config.sampling_rate
    elif model_id == 'dia':
        from dia.model import Dia
        model = Dia.from_pretrained('nari-labs/Dia-1.6B-0626', compute_dtype='float32' if device() == 'cpu' else 'float16')
        audio = model.generate(text, use_torch_compile=False, verbose=False)
        sr = 44100
    elif model_id == 'csm':
        os.environ['NO_TORCH_COMPILE'] = '1'
        from generator import load_csm_1b, Segment
        import torchaudio
        model = load_csm_1b(device=device())
        context = []
        if ref:
            reference, rate = torchaudio.load(ref)
            reference = torchaudio.functional.resample(reference.mean(dim=0), rate, model.sample_rate)
            context = [Segment(text=transcript, speaker=int(voice), audio=reference)]
        audio = model.generate(text=text, speaker=int(voice), context=context, max_audio_length_ms=30000).cpu().numpy()
        sr = model.sample_rate
    elif model_id == 'styletts':
        from styletts2 import tts
        model = tts.StyleTTS2()
        audio = model.inference(text, target_voice_path=ref, output_sample_rate=24000)
    elif model_id == 'piper':
        from piper import PiperVoice, SynthesisConfig
        from piper.download_voices import download_voice
        import wave
        directory = Path(p['voice_dir'])
        directory.mkdir(parents=True, exist_ok=True)
        model_path = directory / (voice + '.onnx')
        if not model_path.is_file() or not model_path.with_suffix('.onnx.json').is_file(): download_voice(voice, directory)
        model = PiperVoice.load(str(model_path))
        with wave.open(str(output), 'wb') as w:
            model.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=1 / speed))
    else:
        raise ValueError('Unknown adapter')
    progress(output, 'encoding')
    if audio is not None:
        if hasattr(audio, 'detach'): audio = audio.detach().cpu().numpy()
        sf.write(output, np.asarray(audio).squeeze(), sr, subtype='PCM_16')
    # Canonical 24 kHz mono PCM16: same format for all adapters and browser MP3 worker.
    audio, sr = sf.read(output, dtype='float32', always_2d=True)
    if not len(audio) or len(audio) > sr * 180 or not np.isfinite(audio).all():
        raise ValueError('Invalid/oversized audio output')
    audio = audio.mean(axis=1)
    if sr != 24000:
        from scipy.signal import resample_poly
        from math import gcd
        factor = gcd(sr, 24000)
        audio = resample_poly(audio, 24000 // factor, sr // factor)
    sf.write(output, audio, 24000, subtype='PCM_16')


if __name__ == '__main__':
    request = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    synthesize(request, Path(sys.argv[2]))
