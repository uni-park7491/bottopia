'use client';

import { useState } from 'react';
import { filterResources, resourceCategories, resourceFormats, resourceSource, type ResourceFeed } from '../../lib/resource-library';
import { useSiteLocale } from '../useSiteLocale';
import LibraryIcon from '../components/LibraryIcon';
import styles from '../components/Library.module.css';

const copy = {
  ko: { label: 'BOTTOPIA LIBRARY', title: '만드는 데 필요한 자료.', intro: '도구부터 제작 과정까지. 필요한 분야와 형식을 골라 살펴보세요.', categories: ['AI 영상', '에이전트·코딩', '프롬프트', '마케팅·수익화', '혜택·할인'], formats: ['GitHub', '스킬·MCP', '영상 제작', '프롬프트', '가이드'], all: '전체', field: '분야', format: '자료 형식', search: '제목·도구·제작자 검색', count: '개 자료', note: '정리된 자료 보기', original: '원문', repos: '연결된 저장소', related: '관련 링크', empty: '조건에 맞는 자료가 없습니다.', reset: '필터 초기화', source: '자료 출처', updated: '수집 기준', notice: '제목과 요약은 원문 작성 시점 기준입니다. 요금·신청 조건·라이선스는 연결된 공식 안내에서 다시 확인하세요. 코드나 스킬은 내용을 검토한 뒤 설치하세요.', more: '원본 메모장 보기', summary: '출처 요약' },
  en: { label: 'BOTTOPIA LIBRARY', title: 'Resources for your next creation.', intro: 'Explore tools and workflows by topic and format.', categories: ['AI video', 'Agents & coding', 'Prompts', 'Marketing & revenue', 'Offers'], formats: ['GitHub', 'Skills & MCP', 'Video production', 'Prompts', 'Guides'], all: 'All', field: 'Topic', format: 'Format', search: 'Search titles, tools or creators', count: 'resources', note: 'Read notes', original: 'Original', repos: 'Repositories', related: 'Related links', empty: 'No resources match these filters.', reset: 'Reset filters', source: 'Source', updated: 'Collected', notice: 'Titles and summaries reflect the original publication. Check current pricing, eligibility and licenses in official documentation. Review code and skills before installation. Source content is in its original language.', more: 'Open source notebook', summary: 'Source summary' },
  zh: { label: 'BOTTOPIA LIBRARY', title: '为创作准备的资料。', intro: '按领域和资料类型查找工具与制作流程。', categories: ['AI 视频', '智能体与开发', '提示词', '营销与收益', '优惠'], formats: ['GitHub', '技能与 MCP', '视频制作', '提示词', '指南'], all: '全部', field: '领域', format: '资料类型', search: '搜索标题、工具或作者', count: '份资料', note: '查看整理资料', original: '原文', repos: '代码仓库', related: '相关链接', empty: '没有符合条件的资料。', reset: '重置筛选', source: '资料来源', updated: '收集日期', notice: '标题和摘要以原文发布时为准。请通过官方说明核实当前价格、条件和许可。安装前请检查代码与技能内容。资料保留原始语言。', more: '打开原始笔记', summary: '来源摘要' },
  ja: { label: 'BOTTOPIA LIBRARY', title: '創作に役立つ資料。', intro: 'ツールから制作過程まで、分野と形式で探せます。', categories: ['AI映像', 'エージェント・開発', 'プロンプト', 'マーケティング・収益', '特典'], formats: ['GitHub', 'スキル・MCP', '映像制作', 'プロンプト', 'ガイド'], all: 'すべて', field: '分野', format: '資料の形式', search: 'タイトル・ツール・作者を検索', count: '件の資料', note: 'まとめを見る', original: '原文', repos: 'リポジトリ', related: '関連リンク', empty: '条件に合う資料はありません。', reset: '絞り込みをリセット', source: '資料の出典', updated: '収集日', notice: 'タイトルと要約は原文公開時点のものです。料金・条件・ライセンスは公式案内で再確認してください。コードやスキルは確認してからインストールしてください。資料は原語です。', more: '元のメモを開く', summary: '出典の要約' },
};

export default function ResourceLibrary({ feed }: { feed: ResourceFeed }) {
  const locale = useSiteLocale();
  const t = copy[locale];
  const [category, setCategory] = useState('all');
  const [format, setFormat] = useState('all');
  const [query, setQuery] = useState('');
  const visible = filterResources(feed.items, category, format, query);
  const reset = () => { setCategory('all'); setFormat('all'); setQuery(''); };
  return <main className={styles.page} id="resources">
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>{t.label}</p><h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p></div>
      <div className={styles.heroMark}><LibraryIcon name="book" /><span>{feed.items.length}<small>{t.count}</small></span></div>
    </header>
    <section className={styles.filters} aria-label={t.field}>
      <div className={styles.chips} aria-label={t.field} role="group">
        {['all', ...resourceCategories].map((key, index) => <button type="button" key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{index ? t.categories[index - 1] : t.all}<span>{key === 'all' ? feed.items.length : feed.items.filter(item => item.category === key).length}</span></button>)}
      </div>
      <div className={styles.filterRow}>
        <label className={styles.search}><LibraryIcon name="search" /><span className="sr-only">{t.search}</span><input type="search" value={query} placeholder={t.search} onChange={event => setQuery(event.target.value)} /></label>
        <label className={styles.format}>{t.format}<select aria-label={t.format} value={format} onChange={event => setFormat(event.target.value)}><option value="all">{t.all}</option>{resourceFormats.map((key, index) => <option key={key} value={key}>{t.formats[index]}</option>)}</select></label>
        <p className={styles.result} role="status">{visible.length} {t.count}</p>
      </div>
    </section>
    {visible.length ? <section className={styles.grid} aria-label={t.title}>
      {visible.map(item => <article className={styles.card} key={item.id} id={item.id}>
        <div className={styles.cardTop}><span className={styles.type}><LibraryIcon name={item.repositories.length ? 'code' : item.category === 'video' ? 'play' : 'book'} />{item.repositories.length ? 'GitHub' : t.categories[resourceCategories.indexOf(item.category)]}</span><time dateTime={item.publishedAt}>{item.publishedAt}</time></div>
        <h2><a href={item.noteUrl} target="_blank" rel="noopener noreferrer">{item.title}</a></h2>
        <p className={styles.description} aria-label={t.summary}>{item.description}</p>
        <div className={styles.credit}>{item.author || new URL(item.sourceUrl).hostname}<span>{item.topic}</span></div>
        {item.repositories.length > 0 && <details className={styles.details}><summary>{t.repos} <span>{item.repositories.length}</span></summary><ul>{item.repositories.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).pathname.slice(1)} ↗</a></li>)}</ul></details>}
        {item.relatedUrls.length > 0 && <details className={styles.details}><summary>{t.related} <span>{item.relatedUrls.length}</span></summary><ul>{item.relatedUrls.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}{new URL(url).pathname === '/' ? '' : new URL(url).pathname} ↗</a></li>)}</ul></details>}
        <footer className={styles.cardActions}><a className={styles.primaryLink} href={item.repositories[0] || item.noteUrl} target="_blank" rel="noopener noreferrer">{item.repositories.length ? 'GitHub' : t.note} <span aria-hidden="true">↗</span></a><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t.original} ↗</a></footer>
      </article>)}
    </section> : <section className={styles.empty}><LibraryIcon name="search" /><h2>{t.empty}</h2><button type="button" onClick={reset}>{t.reset}</button></section>}
    <footer className={styles.source}><p>{t.notice}</p><div><span>{t.source}: <a href={resourceSource} target="_blank" rel="noopener noreferrer">링크드메모 ↗</a></span><span>{t.updated}: {feed.importedAt.slice(0, 10)}</span><a href={resourceSource} target="_blank" rel="noopener noreferrer">{t.more} ↗</a></div></footer>
  </main>;
}
