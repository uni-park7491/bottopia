export type TtsEngine = 'supertonic' | 'qwen' | 'kokoro';
export type TtsUse = 'read' | 'express' | 'design' | 'clone' | 'dialogue';
export type TtsModel = {
  id: string; family: string; name: string; summary: string;
  korean: boolean; languages: string; uses: TtsUse[];
  steps: string; note: string; source: string; engine?: TtsEngine; size?: string;
};
export const ttsUses: {id: TtsUse; label: string}[] = [
  {id:'read',label:'일반 낭독'}, {id:'express',label:'감정·말투'},
  {id:'design',label:'목소리 만들기'}, {id:'clone',label:'음성 복제'}, {id:'dialogue',label:'여러 사람 대화'},
];
// A catalog entry is not an inference adapter. Only engine-backed entries may generate.
export const ttsModels: TtsModel[] = [
  {id:'supertonic',family:'supertonic',name:'Supertonic 3',summary:'여성·남성 10개 목소리로 낭독하고 속도를 조절합니다.',korean:true,languages:'한국어·영어·일본어 외 28개',uses:['read','express'],steps:'언어·목소리 선택 → 대사 입력 → 생성',note:'공식 문서는 표현 태그 10종 지원을 안내합니다. 이 화면에는 공식 예시 <laugh>·<sigh>·<breath> 3종을 안내하며, 나머지는 표기·동작 확인 후 추가합니다. 현재 연결은 음성 복제를 제공하지 않습니다. 원 제작사 지원은 종료된 공개 모델입니다.',source:'https://huggingface.co/supertone-oss-archive/supertonic-3',engine:'supertonic',size:'약 400MB'},
  {id:'qwen',family:'qwen',name:'Qwen3 · Base 1.7B',summary:'기준 음성의 음색을 참고해 대사를 읽습니다.',korean:true,languages:'한국어·영어·일본어·중국어 외 6개',uses:['read'],steps:'언어·기준 목소리 선택 → 대사 입력 → 생성',note:'현재 연결은 AI 기준 음성 2종입니다. 파일을 올리는 음성 복제와 감정 지시는 아직 연결되지 않았습니다.',source:'https://github.com/QwenLM/Qwen3-TTS',engine:'qwen',size:'약 1.48GB'},
  {id:'qwen-custom',family:'qwen',name:'Qwen3 · CustomVoice 1.7B',summary:'9가지 목소리 중 하나를 고르고 감정과 말투를 지정합니다.',korean:true,languages:'한국어·영어·일본어·중국어 외 6개',uses:['read','express'],steps:'목소리 선택 → 대사·말투 입력 → 생성',note:'예: 차분하게, 밝고 활기차게. 모델 실행 연결이 필요합니다.',source:'https://github.com/QwenLM/Qwen3-TTS'},
  {id:'qwen-design',family:'qwen',name:'Qwen3 · VoiceDesign 1.7B',summary:'원하는 목소리의 특징을 글로 설명해 새 목소리를 만듭니다.',korean:true,languages:'한국어·영어·일본어·중국어 외 6개',uses:['design','express'],steps:'목소리 설명 → 대사 입력 → 생성',note:'예: 낮고 따뜻한 남성 목소리. 모델 실행 연결이 필요합니다.',source:'https://github.com/QwenLM/Qwen3-TTS'},
  {id:'voxcpm',family:'voxcpm',name:'VoxCPM2',summary:'목소리를 설명해 만들거나, 음성을 참고해 감정과 말투를 바꿉니다.',korean:true,languages:'한국어 포함 30개 언어',uses:['design','clone','express'],steps:'목소리 설명 또는 기준 음성 → 대사 → 생성',note:'기준 음성은 본인 또는 사용 허락을 받은 파일만 사용합니다.',source:'https://github.com/OpenBMB/VoxCPM'},
  {id:'cosyvoice',family:'cosyvoice',name:'CosyVoice 3',summary:'기준 음성으로 읽으면서 감정·속도·음량을 지시합니다.',korean:true,languages:'한국어 포함 9개 언어',uses:['clone','express'],steps:'기준 음성 → 대사·말투 지시 → 생성',note:'언어와 실행 버전에 따라 적용되는 지시가 다릅니다.',source:'https://github.com/QwenAudio/CosyVoice'},
  {id:'chatterbox',family:'chatterbox',name:'Chatterbox Multilingual',summary:'짧은 음성을 참고해 여러 언어로 대사를 읽습니다.',korean:true,languages:'한국어·영어 등 다국어',uses:['clone','express'],steps:'기준 음성 → 언어·대사 → 생성',note:'생성 음성에 식별용 워터마킹이 적용됩니다.',source:'https://github.com/resemble-ai/chatterbox'},
  {id:'omnivoice',family:'omnivoice',name:'OmniVoice',summary:'음성을 복제하거나 나이·음색·말투를 지정해 목소리를 만듭니다.',korean:true,languages:'한국어 포함 다국어',uses:['clone','design','express'],steps:'음성 또는 목소리 특징 → 언어·대사 → 생성',note:'언어별 품질은 다르며 모든 언어를 검증한 상태는 아닙니다.',source:'https://github.com/k2-fsa/OmniVoice'},
  {id:'gpt-sovits',family:'gpt-sovits',name:'GPT-SoVITS',summary:'짧은 음성을 참고해 읽고, 추가 학습으로 목소리를 맞춥니다.',korean:true,languages:'한국어·영어·일본어·중국어·광둥어',uses:['clone'],steps:'기준 음성·해당 대사 → 새 대사 → 생성',note:'선택한 사전 학습 모델과 부속 모델의 사용 조건 확인이 필요합니다.',source:'https://github.com/RVC-Boss/GPT-SoVITS'},
  {id:'melo',family:'melo',name:'MeloTTS',summary:'선택한 언어의 기본 목소리로 텍스트를 읽습니다.',korean:true,languages:'한국어·영어·일본어·중국어·프랑스어·스페인어',uses:['read'],steps:'언어·속도 선택 → 대사 입력 → 생성',note:'목소리 디자인보다는 일반 낭독에 맞는 모델입니다.',source:'https://github.com/myshell-ai/MeloTTS'},
  {id:'bark',family:'bark',name:'Bark',summary:'대사와 함께 웃음·한숨 같은 표현도 생성합니다.',korean:true,languages:'한국어·영어 등 다국어',uses:['read','express'],steps:'목소리 선택 → 짧은 대사·표현 입력 → 생성',note:'대사를 빠뜨리거나 의도하지 않은 소리가 나올 수 있습니다.',source:'https://github.com/suno-ai/bark'},
  {id:'kokoro',family:'kokoro',name:'Kokoro-82M',summary:'영어 대사를 여성·남성 목소리로 읽고 속도를 조절합니다.',korean:false,languages:'현재 브라우저 연결: 영어 / 한국어 미지원',uses:['read'],steps:'목소리·속도 선택 → 영어 대사 → 생성',note:'Heart(여성)·Michael(남성). 감정 지시·음성 복제는 지원하지 않습니다.',source:'https://huggingface.co/hexgrad/Kokoro-82M',engine:'kokoro',size:'약 100MB + 실행 파일'},
  {id:'pocket',family:'pocket',name:'Pocket TTS',summary:'CPU에서 실행하며 기본 목소리나 기준 음성으로 읽습니다.',korean:false,languages:'영어·프랑스어·독일어·포르투갈어·이탈리아어·스페인어',uses:['read','clone'],steps:'언어·목소리 또는 음성 선택 → 대사 → 생성',note:'제공 목소리마다 사용 조건이 다를 수 있습니다.',source:'https://github.com/kyutai-labs/pocket-tts'},
  {id:'orpheus',family:'orpheus',name:'Orpheus-TTS',summary:'대사에 웃음·한숨 등의 태그를 넣어 표현합니다.',korean:false,languages:'영어 중심 / 다국어는 모델별 확인',uses:['read','express'],steps:'목소리 선택 → 대사·표현 태그 → 생성',note:'태그 예: <laugh>, <sigh>. 한국어 기본 지원은 확인되지 않았습니다.',source:'https://github.com/canopyai/Orpheus-TTS'},
  {id:'parler',family:'parler',name:'Parler-TTS',summary:'목소리와 읽는 방식, 녹음 분위기를 글로 지정합니다.',korean:false,languages:'공식 Mini v1: 영어',uses:['design','express'],steps:'목소리·말투 설명 → 영어 대사 → 생성',note:'모델이 이해하는 설명과 언어에 맞춰 입력해야 합니다.',source:'https://huggingface.co/parler-tts/parler-tts-mini-v1'},
  {id:'dia',family:'dia',name:'Dia',summary:'두 사람이 주고받는 대화를 한 번에 생성합니다.',korean:false,languages:'공식 모델: 영어',uses:['dialogue','express'],steps:'화자별 대사 작성 → 표현 지정 → 생성',note:'화자 표시를 구분해 입력합니다. 한국어용 모델이 아닙니다.',source:'https://github.com/nari-labs/dia'},
  {id:'csm',family:'csm',name:'CSM',summary:'앞선 대화와 음성을 참고해 다음 대사를 생성합니다.',korean:false,languages:'영어 중심',uses:['dialogue','clone'],steps:'화자·이전 대화 음성 → 다음 대사 → 생성',note:'대화 맥락과 기준 음성이 결과에 영향을 줍니다.',source:'https://github.com/sesameailabs/csm'},
  {id:'styletts',family:'styletts',name:'StyleTTS2',summary:'기준 음성의 스타일을 참고해 대사를 읽습니다.',korean:false,languages:'공식 공개 체크포인트: 영어 중심',uses:['read','clone'],steps:'기준 음성·스타일 설정 → 대사 → 생성',note:'사전 학습 모델의 사용 조건 확인이 필요합니다.',source:'https://github.com/yl4579/StyleTTS2'},
  {id:'piper',family:'piper',name:'Piper',summary:'언어별 목소리를 내려받아 가볍게 텍스트를 읽습니다.',korean:false,languages:'다운로드하는 음성 모델에 따라 다름',uses:['read'],steps:'언어별 음성 설치 → 대사 입력 → 생성',note:'엔진은 GPL-3.0이며 음성 모델별 사용 조건은 별도입니다.',source:'https://github.com/OHF-Voice/piper1-gpl'},
];
export function filterTtsModels(query: string, language: string, use: string) {
  const term = query.trim().toLowerCase();
  return ttsModels.filter(m => (!term || `${m.name} ${m.summary} ${m.languages}`.toLowerCase().includes(term))
    && (language === 'all' || (language === 'ko' ? m.korean : !m.korean))
    && (use === 'all' || m.uses.some(value => value === use)));
}
