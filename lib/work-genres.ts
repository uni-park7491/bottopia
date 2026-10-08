export const workGenres = [
  ['BL', 'BL', 'BL', 'BL', 'BL'],
  ['ACTION', '액션', 'Action', '动作', 'アクション'],
  ['DRAMA', '드라마', 'Drama', '剧情', 'ドラマ'],
  ['ROMANCE', '로맨스', 'Romance', '爱情', 'ロマンス'],
  ['FANTASY', '판타지', 'Fantasy', '奇幻', 'ファンタジー'],
  ['SF', 'SF', 'Sci-fi', '科幻', 'SF'],
  ['HORROR', '공포', 'Horror', '恐怖', 'ホラー'],
  ['COMEDY', '코미디', 'Comedy', '喜剧', 'コメディ'],
  ['ANIMATION', '애니메이션', 'Animation', '动画', 'アニメ'],
  ['MUSIC', '뮤직비디오', 'Music video', '音乐视频', 'MV'],
  ['BRAND FILM', '광고·브랜드', 'Commercial', '广告', '広告'],
  ['LIFESTYLE', '라이프스타일', 'Lifestyle', '生活', 'ライフスタイル'],
  ['EXPERIMENT', '실험', 'Experimental', '实验', '実験'],
  ['STORY', '스토리·미분류', 'Story / unclassified', '故事', 'ストーリー'],
  ['CHARACTER', '캐릭터', 'Character', '角色', 'キャラクター'],
  ['KNOWLEDGE', '제작 정보', 'Production notes', '制作信息', '制作情報'],
] as const;
export function genreLabel(key: string, locale: string = 'ko'): string {
  const index = locale === 'en' ? 2 : locale === 'zh' ? 3 : locale === 'ja' ? 4 : 1;
  return workGenres.find(item => item[0] === key)?.[index] ?? key;
}
export type FeedFilters = { model?: string; duration?: 'ALL' | '15' | '30' };
export function matchesVideoFilters(work: {model:string; tool:string; durationSeconds?:number|null}, filters: FeedFilters): boolean {
  if (filters.model && filters.model !== 'ALL' && (work.model || work.tool) !== filters.model) return false;
  if (filters.duration && filters.duration !== 'ALL') return typeof work.durationSeconds === 'number' && Math.abs(work.durationSeconds - Number(filters.duration)) <= .5;
  return true;
}
