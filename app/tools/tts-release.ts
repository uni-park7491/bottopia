// Upstream license identification is NOT approval of our complete distribution.
export type ReleaseReview = { status: 'source-ready' | 'reviewing' | 'conditions'; reason: string };
export const desktopReleaseReview: Record<string, ReleaseReview> = {
  'qwen-custom': {status:'source-ready', reason:'Qwen 패키지·공식 모델 조건 확인, Apache 2.0 전문·출처 동봉. 가중치를 포함하지 않는 소스 연결기입니다.'},
  'qwen-design': {status:'source-ready', reason:'Qwen 패키지·공식 모델 조건 확인, Apache 2.0 전문·출처 동봉. 가중치를 포함하지 않는 소스 연결기입니다.'},
  voxcpm: {status:'reviewing', reason:'VoxCPM2 가중치와 부속 모델·의존 패키지 검토 중'},
  cosyvoice: {status:'reviewing', reason:'CosyVoice3 가중치·음성 토크나이저·부속 파일 검토 중'},
  chatterbox: {status:'reviewing', reason:'다국어 체크포인트·부속 파일·워터마킹 구성 검토 중'},
  omnivoice: {status:'reviewing', reason:'실제 다운로드 체크포인트·토크나이저·고지 검토 중'},
  'gpt-sovits': {status:'conditions', reason:'사용자가 준비하는 체크포인트와 BERT·HuBERT 등 부속 모델의 조건 확인 필요'},
  melo: {status:'reviewing', reason:'언어별 가중치·사전·발음 처리 의존성 검토 중'},
  bark: {status:'reviewing', reason:'가중치·기본 화자 프리셋·의존 패키지 고지 검토 중'},
  pocket: {status:'conditions', reason:'제공 목소리마다 라이선스가 다르므로 선택 음성별 확인 필요'},
  orpheus: {status:'conditions', reason:'선택 체크포인트·기반 모델·접근 승인 조건 확인 필요'},
  parler: {status:'reviewing', reason:'Mini v1 가중치·음성 코덱·의존 패키지 고지 검토 중'},
  dia: {status:'reviewing', reason:'1.6B-0626 체크포인트·음성 코덱·의존 패키지 고지 검토 중'},
  csm: {status:'conditions', reason:'CSM·Llama 접근 조건과 Mimi 등 부속 모델 조건 확인 필요'},
  styletts: {status:'conditions', reason:'별도 Python 패키지·사전 학습 파일·합성 음성 공개 조건 확인 필요'},
  piper: {status:'conditions', reason:'GPL 엔진과 Lessac 음성의 별도 조건·소스 제공 의무 검토 필요'},
};
export function reviewLabel(id: string) {
  if (desktopReleaseReview[id]?.status === 'source-ready') return '소스 배포 고지 준비됨';
  return desktopReleaseReview[id]?.status === 'conditions' ? '모델별 조건 확인 필요' : '모델 조건 검토 중';
}
// Limited source-only release. NOT a signed installer or full runtime certification.
export function connectorDownload(id: string): string | null {
  if (!Object.hasOwn(desktopReleaseReview,id)) return null;
  return id === 'qwen-custom' || id === 'qwen-design' ? '/downloads/bottopia-qwen-source.zip' : '/downloads/bottopia-tts-connector.zip';
}
export const sourceReadyCount = Object.values(desktopReleaseReview).filter(r=>r.status === 'source-ready').length;
