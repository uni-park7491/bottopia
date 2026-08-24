import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'BOTTOPIA — AI Visual Studio',
  description: 'BOTTOPIA의 AI 영상, 캐릭터, 제작 도구와 프롬프트를 보고 복사해 새로운 세계를 만들어보세요.',
  openGraph: {
    title: 'BOTTOPIA — We Build Worlds That Move',
    description: 'AI 영상과 프롬프트를 공개하는 미래형 크리에이터 아카이브. Watch, copy, remix.',
    type: 'website',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'BOTTOPIA — We Build Worlds That Move' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BOTTOPIA — We Build Worlds That Move',
    description: 'AI 영상과 프롬프트를 공개하는 미래형 크리에이터 아카이브. Watch, copy, remix.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
