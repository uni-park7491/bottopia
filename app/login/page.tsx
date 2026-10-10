import MemberLogin from '../components/MemberLogin';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Locale } from '../i18n';
import { safeReturnPath } from '../../lib/auth-policy';
import { memberPromptNotice } from '../../lib/member-prompt';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '로그인 · BOTTOPIA', robots: { index: false, follow: false } };

const copy = {
  ko: { title: '함께 만드는\n새로운 세계.', subtitle: '로그인 / 회원가입', body: '좋아요와 커뮤니티 노트로 나만의 흔적을 남겨보세요.', account: '처음이라면 선택한 계정으로 자동 가입됩니다. 별도의 비밀번호는 필요하지 않아요.', back: '작품 둘러보기', error: '로그인이 취소되었거나 완료되지 않았어요. 아래에서 다시 시도해주세요.', setup: '로그인 서비스 연결을 준비 중입니다. 아직 실제 가입은 진행되지 않습니다.', privacy: '로그인 제공자의 동의 화면에서 공유할 정보를 확인해주세요. 서로 다른 계정은 별도 회원으로 가입될 수 있습니다.' },
  en: { title: 'A new world.\nMade together.', subtitle: 'LOG IN / JOIN', body: 'Leave your own trace through likes and community notes.', account: 'New here? Your first sign-in creates an account. No separate password needed.', back: 'Explore the works', error: 'Sign-in was cancelled or could not finish. Please try again below.', setup: 'Sign-in is being set up. No account will be created yet.', privacy: 'Review the information shared on your provider’s consent screen. Different accounts may create separate memberships.' },
  zh: { title: '一起创造\n新的世界。', subtitle: '登录 / 注册', body: '通过点赞与社区笔记，留下属于你的痕迹。', account: '首次登录会自动创建账号，无需设置额外密码。', back: '浏览作品', error: '登录已取消或未完成，请在下方重试。', setup: '登录服务正在准备中，暂时不会创建账号。', privacy: '请在登录提供商的授权页面确认共享信息。不同账号可能会创建独立会员。' },
  ja: { title: 'ともにつくる、\n新しい世界。', subtitle: 'ログイン / 登録', body: 'いいねとコミュニティノートで、あなたの足跡を残しましょう。', account: '初回ログインでアカウントが作成されます。別のパスワードは不要です。', back: '作品を見る', error: 'ログインがキャンセルされたか、完了しませんでした。もう一度お試しください。', setup: 'ログインサービスを準備中です。まだ登録は行われません。', privacy: 'ログイン提供元の同意画面で共有情報をご確認ください。異なるアカウントは別の会員として登録される場合があります。' },
} as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const locale: Locale = typeof params.lang === 'string' && ['ko', 'en', 'zh', 'ja'].includes(params.lang) ? params.lang as Locale : 'ko';
  const t = copy[locale];
  const next = safeReturnPath(typeof params.next === 'string' ? params.next : '/');
  return (
    <main className="login-shell" lang={locale}>

      <section className="login-layout">
        <div className="login-intro"><p className="eyebrow">BOTTOPIA COMMUNITY</p><h1>{t.title}</h1><p>{t.body}</p><span className="login-orbit" aria-hidden="true"><i /></span></div>
        <div className="login-card">
          <p className="eyebrow">WELCOME TO BOTTOPIA</p><h2>{t.subtitle}</h2><p className="login-description">{t.account}</p>
          {params.reason === 'prompt' && <p className="login-notice">{memberPromptNotice[locale]}</p>}
          {next.startsWith('/studio') && <p className="login-description">{({ ko: '로그인 후 크리에이터 승인 상태를 확인하고 작품을 공유할 수 있습니다. 작품 감상은 로그인 없이, 프롬프트 열람·복사는 로그인 후 가능합니다.', en: 'Sign in to check your creator approval and share work. Works are public; viewing and copying prompts requires sign-in.', zh: '登录后可查看创作者审核状态并分享作品。作品可公开浏览，查看和复制提示词需要登录。', ja: 'ログイン後、承認状況を確認して作品を共有できます。作品は公開、プロンプトの閲覧・コピーはログイン後に利用できます。' })[locale]}</p>}
          {params.error && <p className="login-notice" role="alert">{params.error === 'setup' ? t.setup : t.error}</p>}
          <MemberLogin locale={locale} returnTo={next} />
          <Link className="login-skip" href="/">{({ ko: '로그인 없이 홈 피드 보기 →', en: 'Browse the home feed without signing in →', zh: '无需登录，浏览首页 →', ja: 'ログインせずにホームフィードを見る →' })[locale]}</Link>
          <p className="login-privacy">{t.privacy}</p>
          <p className="login-privacy"><Link href="/privacy">{({ ko: '개인정보처리방침', en: 'Privacy Policy', zh: '隐私政策', ja: 'プライバシーポリシー' })[locale]}</Link></p>
          <nav className="login-languages" aria-label="Language">{(['ko', 'en', 'zh', 'ja'] as const).map((lang, i) => <Link key={lang} lang={lang} aria-current={lang === locale ? 'page' : undefined} href={`/login?${new URLSearchParams({ lang, next, ...(params.reason === 'prompt' ? { reason: 'prompt' } : {}), ...(typeof params.error === 'string' ? { error: params.error } : {}) })}`}>{['한국어', 'English', '中文', '日本語'][i]}</Link>)}</nav>
        </div>
      </section>
      <footer className="login-footer">WATCH. LEARN. REMIX.</footer>
    </main>
  );
}
