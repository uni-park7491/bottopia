export type DesktopSpec = { languages: string[]; voices?: string[]; reference?: 'optional'|'required'; instruction?: string; speed?: boolean; help: string; python: string };
const multi = ['ko','en','ja','zh','de','fr','es','it','pt','ru'];
export const desktopSpecs: Record<string,DesktopSpec> = {
  'qwen-custom': {languages:multi,voices:['Sohee','Vivian','Serena','Uncle_Fu','Dylan','Eric','Ryan','Aiden','Ono_Anna'],instruction:'말투·감정 (선택)',help:'대사와 연기 지시를 따로 입력하세요. Sohee는 한국어 여성 목소리입니다.',python:'3.11'},
  'qwen-design': {languages:multi,instruction:'목소리 설명 (필수)',help:'예: A warm, low-pitched male voice, speaking calmly. 대사와 설명을 따로 입력합니다.',python:'3.11'},
  voxcpm: {languages:multi,reference:'optional',instruction:'목소리·말투 설명 (선택)',help:'설명은 모델의 괄호 제어 문법으로 전달됩니다. 예: slightly faster, cheerful tone.',python:'3.11'},
  cosyvoice: {languages:['ko','en','ja','zh','de','fr','es','it','ru'],reference:'required',instruction:'말투·감정 (선택)',help:'기준 음성과 그 대사가 필요합니다. [laughter], [breath] 등 모델 전용 태그를 사용하세요.',python:'3.10'},
  chatterbox: {languages:[...multi,'ar','hi'],reference:'optional',help:'기준 음성으로 음색을 참고합니다. 결과에 모델 자체 워터마크가 포함됩니다.',python:'3.11'},
  omnivoice: {languages:[...multi,'ar','hi'],reference:'optional',instruction:'목소리 설명 (기준 음성이 없을 때)',speed:true,help:'예: female, low pitch. 대사의 [laughter]는 비언어 표현입니다. 기준 음성 사용 시 설명 대신 복제를 적용합니다.',python:'3.11'},
  'gpt-sovits': {languages:['ko','en','ja','zh','yue'],reference:'required',speed:true,help:'기준 음성·기준 대사가 필요합니다. 공식 사전 학습 파일과 tts_infer.yaml을 PC에 설정해야 합니다.',python:'3.10'},
  melo: {languages:['ko','en','ja','zh','fr','es'],speed:true,help:'언어별 기본 목소리로 낭독합니다. 괄호 지문은 넣지 마세요.',python:'3.10'},
  bark: {languages:[...multi,'hi','tr','pl'],voices:['0','1','2','3','4','5','6','7','8','9'],help:'짧은 대사에 [laughs], [sighs]를 사용할 수 있습니다. 화자 번호는 성별을 보장하지 않습니다.',python:'3.11'},
  pocket: {languages:['en','fr','de','pt','it','es'],reference:'optional',help:'CPU 실행. 언어별 기본 음성 또는 기준 음성을 사용합니다. 제공 음성별 라이선스를 확인하세요.',python:'3.11'},
  orpheus: {languages:['en'],voices:['tara','leah','jess','leo','dan','mia','zac','zoe'],help:'Linux/WSL 및 지원 NVIDIA CUDA GPU 필요. <laugh>, <sigh> 등 태그를 대사에 넣습니다. 모델 접근 승인이 필요할 수 있습니다.',python:'3.10'},
  parler: {languages:['en'],instruction:'목소리·녹음 분위기 설명 (필수)',help:'목소리 설명은 영어로 작성합니다. 예: A female speaker delivers a calm speech with clear audio.',python:'3.11'},
  dia: {languages:['en'],help:'[S1] 첫 화자 [S2] 두 번째 화자. (laughs), (sighs) 같은 공식 비언어 표현을 사용할 수 있습니다.',python:'3.11'},
  csm: {languages:['en'],voices:['0','1'],reference:'optional',help:'화자 0/1은 성별이 아닙니다. 기준 음성·대사를 대화 맥락으로 사용합니다. Hugging Face 모델 접근 승인을 먼저 완료하세요.',python:'3.10'},
  styletts: {languages:['en'],reference:'optional',help:'공식 저장소에서 소개하는 styletts2 Python 패키지 연결입니다. 원본과 발음 처리 방식이 달라 결과 차이가 있습니다. 공개 시 합성 음성 표시 조건을 확인하세요.',python:'3.10'},
  piper: {languages:['en'],voices:['en_US-lessac-medium'],speed:true,help:'가벼운 CPU 모델. 현재 연결한 음성은 영어 Lessac입니다. 엔진 GPL-3.0, 음성 모델의 라이선스는 별도입니다.',python:'3.11'},
};
export const CONNECTOR_URL = 'http://127.0.0.1:47831';
export async function connectorRequest(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(CONNECTOR_URL + path, { ...options, cache:'no-store', credentials:'omit', redirect:'error', headers:{'Authorization':`Bearer ${token}`, ...(options.body ? {'Content-Type':'application/json'} : {})}, signal:options.signal ?? AbortSignal.timeout(10000) });
  if (!response.ok) { const data = await response.json().catch(()=>null); throw new Error(data?.error || `PC 연결 오류 (${response.status})`); }
  return response;
}
