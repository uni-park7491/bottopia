'use client';

import { FormEvent, useEffect, useState } from 'react';
import CreatorArchive from './components/CreatorArchive';
import MemberLogin from './components/MemberLogin';

type Project = {
  id: string;
  title: string;
  category: 'AI FILM' | 'CHARACTER' | 'CAMPAIGN';
  year: string;
  className: string;
  ratio: 'portrait' | 'landscape' | 'square';
  summary: string;
};

const projects: Project[] = [
  { id: '01', title: 'NEON FAMILIAR', category: 'CHARACTER', year: '2026', className: 'art-neon', ratio: 'portrait', summary: '낯설지만 이상하게 친근한 디지털 존재. 캐릭터 개발부터 무빙 포트레이트까지 이어진 오리지널 시리즈.' },
  { id: '02', title: 'SOFT MACHINE', category: 'AI FILM', year: '2026', className: 'art-soft', ratio: 'landscape', summary: '기계가 꿈을 꾼다면 어떤 질감일까. 실사와 비현실의 경계를 탐색한 30초 AI 아트 필름.' },
  { id: '03', title: 'AFTER HUMAN', category: 'CAMPAIGN', year: '2026', className: 'art-human', ratio: 'portrait', summary: '패션과 기술의 다음 장면을 상상한 브랜드 비주얼 캠페인. 키비주얼과 숏폼 패키지로 제작.' },
  { id: '04', title: 'PLASTIC HEAVEN', category: 'CAMPAIGN', year: '2025', className: 'art-plastic', ratio: 'square', summary: '과감한 컬러와 촉감이 살아있는 초현실 오브젝트를 중심으로 만든 소셜 캠페인.' },
  { id: '05', title: 'DREAM DELIVERY', category: 'CHARACTER', year: '2025', className: 'art-dream', ratio: 'portrait', summary: '매일 밤 꿈을 배달하는 작은 로봇. 세계관, 캐릭터 시트, 에피소드 비주얼을 함께 설계했다.' },
  { id: '06', title: 'NEW FOLKLORE', category: 'AI FILM', year: '2025', className: 'art-folk', ratio: 'landscape', summary: '한국적 상징을 미래적인 화면 언어로 다시 읽은 실험 영화. 60초, 9:16·16:9 동시 제작.' },
];

const categories = ['ALL', 'AI FILM', 'CHARACTER', 'CAMPAIGN'] as const;
const workWorlds = ['CREATOR ARCHIVE', 'ORIGINAL LAB'] as const;

export default function Home() {
  const [filter, setFilter] = useState<(typeof categories)[number]>('ALL');
  const [workWorld, setWorkWorld] = useState<(typeof workWorlds)[number]>('CREATOR ARCHIVE');
  const [selected, setSelected] = useState<Project | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const visibleProjects = filter === 'ALL' ? projects : projects.filter((project) => project.category === filter);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setInquiryOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const brief = [
      '[BOTTOPIA PROJECT INQUIRY]',
      `Name: ${data.get('name')}`,
      `Contact: ${data.get('contact')}`,
      `Project: ${data.get('project')}`,
      `Timeline / Budget: ${data.get('range')}`,
      `Brief: ${data.get('brief')}`,
    ].join('\n');
    await navigator.clipboard?.writeText(brief);
    setCopied(true);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="BOTTOPIA 홈">BOT<span>•</span>TOPIA</a>
        <nav className="nav" aria-label="주요 메뉴">
          <a href="#work">PROMPT</a>
          <button className="nav-link-button" onClick={() => { setWorkWorld('ORIGINAL LAB'); document.querySelector('#work')?.scrollIntoView(); }}>ORIGINAL LAB</button>
          <a href="#ecosystem">ECOSYSTEM</a>
          <a href="#about">ABOUT</a>
          <MemberLogin compact />
          <button className="nav-cta" onClick={() => setInquiryOpen(true)}>START A PROJECT ↗</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <h1>BOTTOPIA<span>.</span></h1>
        <div className="hero-bottom">
          <p>AI로 만든 영상과 사용한 프롬프트를 함께 아카이브하는 갤러리.<br />마음에 드는 세계를 복사하고 당신의 방식으로 다시 만들어보세요.</p>
          <span>LIVE GALLERY · SEOUL</span>
        </div>
      </section>

      <section className="worlds-hub" id="work">
        <div className="world-switcher">
          <div>
            <p>SELECT A BOTTOPIA CHANNEL</p>
            <span>업로드한 영상 아카이브와 BOTTOPIA의 오리지널 작업을 나누어 탐색하세요.</span>
          </div>
          <div className="world-tabs" role="tablist" aria-label="작업 카테고리">
            {workWorlds.map((world, index) => (
              <button
                key={world}
                type="button"
                role="tab"
                aria-selected={workWorld === world}
                aria-controls={world === 'CREATOR ARCHIVE' ? 'creator-archive-panel' : 'original-lab-panel'}
                className={workWorld === world ? 'active' : ''}
                onClick={() => setWorkWorld(world)}
              >
                <small>0{index + 1}</small>
                <span>{world === 'CREATOR ARCHIVE' ? 'PROMPT ARCHIVE' : world}</span>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>
        </div>

        {workWorld === 'CREATOR ARCHIVE' ? (
          <div id="creator-archive-panel" role="tabpanel">
            <CreatorArchive />
          </div>
        ) : (
          <section className="work-preview" id="original-lab-panel" role="tabpanel">
            <div className="section-head">
              <h2>ORIGINAL<br />LAB</h2>
              <p>01—06 / BOTTOPIA WORLD STUDIES</p>
            </div>
            <div className="filters" aria-label="작품 필터">
              {categories.map((category) => (
                <button key={category} className={filter === category ? 'active' : ''} onClick={() => setFilter(category)}>
                  {category} <sup>{category === 'ALL' ? projects.length : projects.filter((item) => item.category === category).length}</sup>
                </button>
              ))}
            </div>
            <div className="project-grid">
              {visibleProjects.map((work) => (
                <button className={`project-card ${work.ratio}`} key={work.id} onClick={() => setSelected(work)} aria-label={`${work.title} 프로젝트 상세 보기`}>
                  <div className={`artwork ${work.className}`}>
                    <span className="art-number">{work.id}</span>
                    <span className="art-orbit" />
                    <span className="art-core" />
                    <span className="view-tag">VIEW PROJECT ↗</span>
                  </div>
                  <div className="project-meta">
                    <h3>{work.title}</h3>
                    <span>{work.category} · {work.year}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>

      <section className="ecosystem" id="ecosystem">
        <div className="ecosystem-intro">
          <p className="eyebrow">SCROLL TO ENTER · BOTTOPIA ECOSYSTEM</p>
          <h2>ONE BOT.<br />INFINITE<br /><em>WORLDS.</em></h2>
          <p>아이디어가 캐릭터가 되고, 캐릭터가 이야기를 만들고, 이야기가 다시 누군가의 새로운 창작으로 이어지는 곳.</p>
        </div>
        <div className="orbit-system" aria-label="BOTTOPIA 창작 생태계">
          <span className="space-grid" /><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-ring ring-three" />
          <div className="orbit-bot" aria-hidden="true"><i /><b /><b /></div>
          <div className="planet planet-idea"><i />IDEA<small>SEED 01</small></div><div className="planet planet-character"><i />CHARACTER<small>FORM 02</small></div>
          <div className="planet planet-story"><i />STORY<small>WORLD 03</small></div><div className="planet planet-motion"><i />MOTION<small>MOVE 04</small></div><div className="planet planet-remix"><i />REMIX<small>SHARE 05</small></div>
          <p className="orbit-caption">BOT.TOPIA / CREATIVE LOOP / ALWAYS IN MOTION</p>
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-label">
          <p>( ABOUT BOTTOPIA )</p>
          <div className="tiny-bot" aria-hidden="true"><span /></div>
        </div>
        <div className="about-copy">
          <h2>GOOD IDEAS<br />DESERVE<br /><em>NEW WORLDS.</em></h2>
          <p>BOTTOPIA는 AI를 도구로 쓰되, 결과보다 먼저 이야기를 설계합니다. 브랜드 필름부터 캐릭터와 소셜 콘텐츠까지, 짧게 보고 오래 기억되는 장면을 만듭니다.</p>
        </div>
      </section>

      <section className="services" aria-labelledby="services-title">
        <p className="eyebrow" id="services-title">WHAT WE MAKE</p>
        <div className="service-list">
          <article><span>01</span><h3>AI FILM</h3><p>브랜드 필름 · 뮤직비디오 · 숏폼</p></article>
          <article><span>02</span><h3>CHARACTER</h3><p>캐릭터 개발 · 시트 · 세계관 설계</p></article>
          <article><span>03</span><h3>CAMPAIGN</h3><p>키비주얼 · 소셜 패키지 · 모션</p></article>
          <article><span>04</span><h3>R&amp;D</h3><p>AI 워크플로 · 비주얼 프로토타입</p></article>
        </div>
        <div className="process-note">
          <span>BRIEF</span><i>→</i><span>WORLD</span><i>→</i><span>MAKE</span><i>→</i><span>DELIVER</span>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="availability"><i /> NOW BOOKING · Q4 2026</div>
        <p>HAVE A WORLD IN MIND?</p>
        <button onClick={() => setInquiryOpen(true)}>LET&apos;S MAKE<br />IT REAL ↗</button>
        <footer>
          <span>© 2026 BOTTOPIA</span>
          <a href="https://www.instagram.com/bot.topia/" target="_blank" rel="noreferrer">INSTAGRAM @BOT.TOPIA ↗</a>
          <a href="/studio">CREATOR STUDIO ↗</a>
          <a href="#top">BACK TO TOP ↑</a>
        </footer>
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
            <div className={`modal-art artwork ${selected.className}`}><span className="art-orbit" /><span className="art-core" /></div>
            <div className="modal-copy">
              <p>{selected.id} / {selected.category} / {selected.year}</p>
              <h2 id="project-title">{selected.title}</h2>
              <p>{selected.summary}</p>
              <button onClick={() => { setSelected(null); setInquiryOpen(true); }}>비슷한 프로젝트 문의하기 ↗</button>
            </div>
          </article>
        </div>
      )}

      {inquiryOpen && (
        <div className="modal-backdrop inquiry-backdrop" role="presentation" onMouseDown={() => setInquiryOpen(false)}>
          <section className="inquiry-panel" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setInquiryOpen(false)} aria-label="닫기">×</button>
            <div>
              <p className="eyebrow">START A PROJECT</p>
              <h2 id="inquiry-title">TELL US ABOUT<br />YOUR WORLD.</h2>
              <p className="inquiry-intro">아직 구체적이지 않아도 괜찮아요. 알고 있는 만큼만 남겨주세요.</p>
            </div>
            {!copied ? (
              <form onSubmit={handleInquiry}>
                <label>NAME / COMPANY<input required name="name" placeholder="성함 또는 회사명" /></label>
                <label>CONTACT<input required name="contact" placeholder="이메일 또는 연락처" /></label>
                <label>PROJECT TYPE<select name="project" defaultValue="AI FILM"><option>AI FILM</option><option>CHARACTER</option><option>CAMPAIGN</option><option>OTHER</option></select></label>
                <label>TIMELINE / BUDGET<input name="range" placeholder="예: 10월 공개 / 500만원 내외" /></label>
                <label>BRIEF<textarea required name="brief" rows={4} placeholder="만들고 싶은 것과 목적을 자유롭게 적어주세요." /></label>
                <button type="submit" className="submit-inquiry">문의 내용 복사하기 ↗</button>
              </form>
            ) : (
              <div className="copied-message" role="status">
                <span>✓</span>
                <h3>문의 내용이 복사됐어요.</h3>
                <p>Instagram DM에 붙여넣어 보내주세요. BOTTOPIA가 확인 후 답장드릴게요.</p>
                <a href="https://www.instagram.com/bot.topia/" target="_blank" rel="noreferrer">@BOT.TOPIA로 보내기 ↗</a>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
