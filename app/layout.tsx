import type { Metadata } from 'next';
import './globals.css';
import './refinement.css';
import SiteHeader from './components/SiteHeader';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'BOTTOPIA — AI Film & Creator Network',
  description: 'AI 필름 작품과 제작 과정을 공개하고, 크리에이터와 협업 및 프로젝트로 연결되는 BOTTOPIA 네트워크입니다.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'BOTTOPIA — Worlds in Motion',
    description: 'An open AI film portfolio and creator network for sharing process, finding collaborators, and starting projects.',
    type: 'website',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'BOTTOPIA — We Build Worlds That Move' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BOTTOPIA — Worlds in Motion',
    description: 'An open AI film portfolio and creator network for sharing process, finding collaborators, and starting projects.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body><SiteHeader />{children}<div style={{ padding: '24px', textAlign: 'center', fontSize: '14px', lineHeight: 1.8 }}><Link href="/privacy">개인정보처리방침 · Privacy Policy</Link></div></body>
    </html>
  );
}
