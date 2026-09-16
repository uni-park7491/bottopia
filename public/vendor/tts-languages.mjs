// Only languages supported by the pinned inference engines are exposed.
export const speechLanguages = [
  ['ko', '한국어'], ['en', '영어'], ['ja', '일본어'], ['zh', '중국어'],
  ['de', '독일어'], ['es', '스페인어'], ['fr', '프랑스어'], ['it', '이탈리아어'],
  ['pt', '포르투갈어'], ['ru', '러시아어'], ['ar', '아랍어'], ['bg', '불가리아어'],
  ['cs', '체코어'], ['da', '덴마크어'], ['el', '그리스어'], ['et', '에스토니아어'],
  ['fi', '핀란드어'], ['hi', '힌디어'], ['hr', '크로아티아어'], ['hu', '헝가리어'],
  ['id', '인도네시아어'], ['lt', '리투아니아어'], ['lv', '라트비아어'], ['nl', '네덜란드어'],
  ['pl', '폴란드어'], ['ro', '루마니아어'], ['sk', '슬로바키아어'], ['sl', '슬로베니아어'],
  ['sv', '스웨덴어'], ['tr', '튀르키예어'], ['uk', '우크라이나어'], ['vi', '베트남어'],
];
const qwen = new Set(['ko', 'en', 'ja', 'zh', 'de', 'es', 'fr', 'it', 'pt', 'ru']);
export function languagesFor(engine) {
  if (!['qwen', 'supertonic'].includes(engine)) throw new Error('지원하지 않는 음성 모델입니다.');
  return speechLanguages.filter(([code]) => engine === 'qwen' ? qwen.has(code) : code !== 'zh');
}
export function validateLanguage(engine, language = 'ko') {
  if (!languagesFor(engine).some(([code]) => code === language)) throw new Error('이 모델이 지원하지 않는 언어입니다.');
  return language;
}
