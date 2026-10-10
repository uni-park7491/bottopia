'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSiteLocale } from '../useSiteLocale';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const text = {
  ko: { menu:'모바일 메뉴', names:['탐색','창작 도구','올리기','커뮤니티','내 프로필'], install:'앱 설치', title:'홈 화면에 봇토피아 추가', ios:'iPhone·iPad: Safari의 공유 메뉴에서 ‘홈 화면에 추가’를 선택하세요.', other:'Android: Chrome 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요. 지원 브라우저에서 사용할 수 있습니다.', done:'닫기', offline:'인터넷 연결이 끊겼습니다. 업로드와 저장은 연결 후 다시 시도하세요.' },
  en: { menu:'Mobile navigation', names:['Explore','Tools','Upload','Community','Profile'], install:'Install app', title:'Add BOTTOPIA to your home screen', ios:'iPhone / iPad: open Safari’s Share menu and choose Add to Home Screen.', other:'Android: open Chrome’s menu and choose Install app or Add to Home screen. Requires a supported browser.', done:'Close', offline:'You are offline. Reconnect before uploading or saving.' },
  zh: { menu:'移动导航', names:['探索','工具','上传','社区','我的'], install:'安装应用', title:'将 BOTTOPIA 添加到主屏幕', ios:'iPhone / iPad：在 Safari 分享菜单中选择“添加到主屏幕”。', other:'Android：在 Chrome 菜单中选择“安装应用”或“添加到主屏幕”。需要支持的浏览器。', done:'关闭', offline:'网络已断开。重新连接后再上传或保存。' },
  ja: { menu:'モバイルメニュー', names:['探索','ツール','投稿','コミュニティ','プロフィール'], install:'アプリ追加', title:'BOTTOPIAをホーム画面に追加', ios:'iPhone / iPad：Safariの共有メニューから「ホーム画面に追加」を選択してください。', other:'Android：Chromeのメニューから「アプリをインストール」または「ホーム画面に追加」を選択してください。対応ブラウザが必要です。', done:'閉じる', offline:'オフラインです。接続後にアップロードや保存を再試行してください。' },
};
const paths = ['/', '/tools', '/studio', '/community', '/profile'];
const icons = [<><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,<><path d="M12 5v14M5 12h14"/></>,<><path d="M21 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 19 0Z"/></>,<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>];

export default function MobileApp() {
  const pathname = usePathname();
  const locale = useSiteLocale();
  const t = text[locale];
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)');
    const updateMode = () => setStandalone(mode.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const updateNetwork = () => setOffline(!navigator.onLine);
    const beforeInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const installed = () => { setStandalone(true); setHelp(false); setInstall(null); };
    updateMode(); updateNetwork();
    mode.addEventListener('change', updateMode);
    window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork);
    window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', installed);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope:'/', updateViaCache:'none' }).catch(() => { /* Installation instructions remain available without a worker. */ });
    return () => {
      mode.removeEventListener('change', updateMode);
      window.removeEventListener('online', updateNetwork); window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installed);
    };
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setHelp(false); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);
  async function requestInstall() {
    if (!install) { setHelp(current => !current); return; }
    try { await install.prompt(); await install.userChoice; } catch { setHelp(true); }
    finally { setInstall(null); }
  }
  return <>
    {offline && <p className="app-network-notice" role="status">{t.offline}</p>}
    <div className="mobile-app-install">
      {!standalone && <button type="button" aria-expanded={help} onClick={requestInstall}><span aria-hidden="true">↓</span> {t.install}</button>}
      <div className="mobile-extra-links"><Link href="/creators">{({ko:'크리에이터',en:'Creators',zh:'创作者',ja:'クリエイター'})[locale]}</Link><Link href="/about">{({ko:'소개',en:'About',zh:'关于',ja:'紹介'})[locale]}</Link></div>
      {help && <section className="mobile-install-help" aria-label={t.title}><strong>{t.title}</strong><p>{t.ios}</p><p>{t.other}</p><button type="button" onClick={() => setHelp(false)}>{t.done}</button></section>}
    </div>
    <nav className="mobile-app-nav" aria-label={t.menu}>
      {paths.map((path, index) => {
        const active = path === '/' ? pathname === '/' || pathname.startsWith('/works/') : pathname === path || pathname.startsWith(path+'/');
        const NavLink = path === '/tools' || pathname.startsWith('/tools') ? 'a' : Link;
        return <NavLink key={path} href={path} aria-current={active ? 'page' : undefined}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[index]}</svg><span>{t.names[index]}</span></NavLink>;
      })}
    </nav>
  </>;
}
