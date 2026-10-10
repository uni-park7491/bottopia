import Link from 'next/link';
import type { Locale } from '../i18n';
import { operatorEmail, operatorMailto } from '../../lib/contact';
import styles from './AboutPage.module.css';

const content = {
  ko: {
    label: '봇토피아 소개', title: '작품을 발견하고,\n함께 만드는 공간.',
    intro: '봇토피아는 AI 영상과 제작 과정을 나누는 크리에이터 공간입니다. 작품을 살펴보고, 창작 도구를 사용하고, 함께할 사람을 만나세요.',
    explore: '작품 둘러보기', join: '크리에이터 프로필 만들기', heading: '여기서 할 수 있는 일',
    cards: [
      ['작품과 제작 과정', '영상과 제작 정보를 함께 살펴보세요. 프롬프트 복사는 회원 로그인 후 사용할 수 있습니다.', '작품 보기'],
      ['창작 도구', '시나리오·샷리스트, TTS, 워터마크와 QR 코드로 제작에 필요한 작업을 이어가세요.', '도구 열기'],
      ['함께할 사람 찾기', '필요한 역할을 모집하거나 프로젝트에 지원하세요. 관심 키워드에 맞는 모집 소식도 확인할 수 있습니다.', '모집글 보기'],
    ],
    note: '일부 창작 도구는 PC 연결기와 모델 설치가 필요합니다. 각 도구에서 실행 환경과 사용 방법을 확인하세요.',
    studio: '제작 의뢰', studioTitle: '만들고 싶은 영상이 있나요?',
    studioBody: '브랜드 영상, 숏폼, 비주얼 콘텐츠 제작을 문의할 수 있습니다. 목적과 참고 영상, 일정·예산을 보내주세요.', inquiry: '제작 문의하기', social: '봇토피아 인스타그램',
  },
  en: {
    label: 'About BOTTOPIA', title: 'Discover work.\nCreate together.',
    intro: 'BOTTOPIA is a creator space for AI video and the process behind it. Explore projects, use creative tools, and find collaborators.',
    explore: 'Explore work', join: 'Create a creator profile', heading: 'What you can do here',
    cards: [
      ['Work and process', 'Explore videos alongside production details. Sign in to copy prompts.', 'View work'],
      ['Creative tools', 'Work with scripts, shot lists, TTS, watermarks, and QR codes.', 'Open tools'],
      ['Find collaborators', 'Recruit for a role or apply to a project. Follow recruitment updates matching your interests.', 'Browse projects'],
    ],
    note: 'Some tools require a PC connector and model installation. Check each tool for requirements and instructions.',
    studio: 'Production enquiries', studioTitle: 'Have a video in mind?',
    studioBody: 'Enquire about brand films, short-form video, and visual content. Share your purpose, references, timeline, and budget.', inquiry: 'Start an enquiry', social: 'BOTTOPIA on Instagram',
  },
  zh: {
    label: '关于 BOTTOPIA', title: '发现作品，\n一起创作。',
    intro: 'BOTTOPIA 是分享 AI 视频和制作过程的创作者空间。在这里探索作品、使用创作工具并寻找合作伙伴。',
    explore: '浏览作品', join: '创建创作者档案', heading: '你可以在这里做什么',
    cards: [
      ['作品与制作过程', '查看视频及制作信息。登录会员账号后可复制提示词。', '查看作品'],
      ['创作工具', '使用剧本、分镜表、TTS、水印和二维码工具辅助制作。', '打开工具'],
      ['寻找合作伙伴', '招募所需角色或申请项目，查看与你的兴趣关键词匹配的招募消息。', '浏览招募'],
    ],
    note: '部分工具需要安装 PC 连接器和模型。请查看各工具的运行环境和使用说明。',
    studio: '制作咨询', studioTitle: '有想制作的视频吗？',
    studioBody: '可咨询品牌视频、短视频和视觉内容制作。请提供目的、参考视频、时间安排和预算。', inquiry: '咨询制作', social: 'BOTTOPIA Instagram',
  },
  ja: {
    label: 'BOTTOPIAについて', title: '作品を見つけ、\n一緒につくる場所。',
    intro: 'BOTTOPIAはAI映像と制作過程を共有するクリエイターのための場所です。作品を見て、創作ツールを使い、仲間を見つけましょう。',
    explore: '作品を見る', join: 'クリエイタープロフィールを作る', heading: 'ここでできること',
    cards: [
      ['作品と制作過程', '映像と制作情報を一緒に確認できます。プロンプトのコピーにはログインが必要です。', '作品を見る'],
      ['創作ツール', 'シナリオ・ショットリスト、TTS、透かし、QRコードで制作を進められます。', 'ツールを開く'],
      ['仲間を探す', '必要な役割を募集したり、プロジェクトに応募したりできます。興味のあるキーワードの募集情報も確認できます。', '募集を見る'],
    ],
    note: '一部のツールにはPC接続ソフトとモデルのインストールが必要です。各ツールの実行環境と使い方をご確認ください。',
    studio: '制作のご相談', studioTitle: 'つくりたい映像はありますか？',
    studioBody: 'ブランド映像、ショート動画、ビジュアルコンテンツの制作をご相談いただけます。目的、参考映像、日程、予算をお知らせください。', inquiry: '制作を相談する', social: 'BOTTOPIAのInstagram',
  },
} as const;

const destinations = ['/', '/tools', '/community'] as const;

export default function AboutPage({ locale, onInquiry }: { locale: Locale; onInquiry: () => void }) {
  const t = content[locale];
  return (
    <div className={styles.page} id="about">
      <section className={styles.hero} aria-labelledby="about-title">
        <p className={styles.label}>{t.label}</p>
        <h1 id="about-title">{t.title}</h1>
        <p className={styles.intro}>{t.intro}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/">{t.explore}<span aria-hidden="true">↗</span></Link>
          <Link className={styles.secondary} href="/profile">{t.join}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <section className={styles.features} id="lab" aria-labelledby="about-features-title">
        <h2 id="about-features-title">{t.heading}</h2>
        <div className={styles.grid}>
          {t.cards.map(([title, description, action], index) => (
            <article className={styles.card} key={destinations[index]}>
              <h3>{title}</h3><p>{description}</p>
              <Link href={destinations[index]}>{action}<span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
        <p className={styles.note}>{t.note}</p>
      </section>
      <section className={styles.contact} id="contact" aria-labelledby="about-contact-title">
        <div><p className={styles.label}>{t.studio}</p><h2 id="about-contact-title">{t.studioTitle}</h2><p>{t.studioBody}</p></div>
        <div className={styles.contactActions}>
          <button type="button" className={styles.primary} onClick={onInquiry}>{t.inquiry}<span aria-hidden="true">↗</span></button>
          <a className={styles.email} href={operatorMailto}>{operatorEmail}</a>
        </div>
      </section>
      <footer className={styles.footer}><span>© {new Date().getFullYear()} BOTTOPIA</span><a href="https://www.instagram.com/bot.topia/" target="_blank" rel="noreferrer">{t.social} ↗</a></footer>
    </div>
  );
}
