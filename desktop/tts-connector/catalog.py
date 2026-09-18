"""Pinned installation recipes; no commands or model paths supplied by web clients."""
MODELS = {
    'qwen-custom': {'module': 'qwen_tts', 'packages': ['qwen-tts==0.1.1'], 'python': '3.11'},
    'qwen-design': {'module': 'qwen_tts', 'packages': ['qwen-tts==0.1.1'], 'python': '3.11'},
    'voxcpm': {'module': 'voxcpm', 'packages': ['voxcpm==2.0.3'], 'python': '3.11'},
    'chatterbox': {'module': 'chatterbox', 'packages': ['chatterbox-tts==0.1.7'], 'python': '3.11'},
    'omnivoice': {'module': 'omnivoice', 'packages': ['omnivoice==0.2.1'], 'python': '3.11'},
    'melo': {'module': 'melo', 'packages': ['git+https://github.com/myshell-ai/MeloTTS.git@209145371cff8fc3bd60d7be902ea69cbdb7965a'], 'python': '3.10'},
    'bark': {'module': 'bark', 'packages': ['git+https://github.com/suno-ai/bark.git@f4f32d4cd480dfec1c245d258174bc9bde3c2148'], 'python': '3.11'},
    'pocket': {'module': 'pocket_tts', 'packages': ['pocket-tts==3.1.0'], 'python': '3.11'},
    'orpheus': {'module': 'orpheus_tts', 'packages': ['orpheus-speech==0.1.0'], 'python': '3.10', 'cuda': True},
    'parler': {'module': 'parler_tts', 'packages': ['parler-tts==0.2.3'], 'python': '3.11'},
    'dia': {'module': 'dia', 'packages': ['git+https://github.com/nari-labs/dia.git@876125e461a03b157ec905b0fe8b57a0f8b9e7a0'], 'python': '3.11'},
    'styletts': {'module': 'styletts2', 'packages': ['styletts2==0.1.6'], 'python': '3.10'},
    'piper': {'module': 'piper', 'packages': ['piper-tts==1.8.0'], 'python': '3.11'},
    'cosyvoice': {'module': 'cosyvoice', 'repo': 'https://github.com/FunAudioLLM/CosyVoice.git', 'revision': '074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc', 'python': '3.10', 'assets': 'pretrained_models/Fun-CosyVoice3-0.5B/cosyvoice3.yaml'},
    'gpt-sovits': {'module': 'GPT_SoVITS', 'repo': 'https://github.com/RVC-Boss/GPT-SoVITS.git', 'revision': '48b1a0169a28582a8984402f82cf438d3bfa6aca', 'python': '3.10', 'assets': 'GPT_SoVITS/pretrained_models/chinese-hubert-base/config.json'},
    'csm': {'module': 'generator', 'repo': 'https://github.com/SesameAILabs/csm.git', 'revision': 'daed31e6d42cf71873999075de204fa37d2acec3', 'python': '3.10'},
}
LANGUAGES = {
    'qwen-custom': ['ko','en','ja','zh','de','fr','ru','pt','es','it'],
    'qwen-design': ['ko','en','ja','zh','de','fr','ru','pt','es','it'],
    'voxcpm': ['ko','en','ja','zh','de','fr','es','it','pt','ru'],
    'cosyvoice': ['ko','en','ja','zh','de','fr','es','it','ru'],
    'chatterbox': ['ko','en','ja','zh','de','fr','es','it','pt','ru','ar','hi'],
    'omnivoice': ['ko','en','ja','zh','de','fr','es','it','pt','ru','ar','hi'],
    'gpt-sovits': ['ko','en','ja','zh','yue'], 'melo': ['ko','en','ja','zh','fr','es'],
    'bark': ['ko','en','ja','zh','de','fr','es','it','pt','ru','hi','tr','pl'],
    'pocket': ['en','fr','de','pt','it','es'],
    **{m: ['en'] for m in ['orpheus','parler','dia','csm','styletts','piper']},
}
VOICES = {
    'qwen-custom': ['Sohee','Vivian','Serena','Uncle_Fu','Dylan','Eric','Ryan','Aiden','Ono_Anna'],
    'orpheus': ['tara','leah','jess','leo','dan','mia','zac','zoe'],
    'piper': ['en_US-lessac-medium'],
    'pocket': ['default'], 'bark': ['0','1','2','3','4','5','6','7','8','9'],
    'csm': ['0','1'],
}
REFERENCE_REQUIRED = {'cosyvoice','gpt-sovits'}
REFERENCE_ALLOWED = {'voxcpm','cosyvoice','chatterbox','omnivoice','gpt-sovits','pocket','styletts','csm'}
