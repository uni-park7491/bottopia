import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'BOTTOPIA — AI Film Director & Visual World Builder',
  description: 'BOTTOPIA의 AI 필름 포트폴리오와 장면을 만든 프롬프트, 제작 과정을 함께 살펴보세요.',
  openGraph: {
    title: 'BOTTOPIA — Worlds in Motion',
    description: 'AI film direction, cinematic worldbuilding, and an open archive of the prompts behind each scene.',
    type: 'website',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'BOTTOPIA — We Build Worlds That Move' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BOTTOPIA — Worlds in Motion',
    description: 'AI film direction, cinematic worldbuilding, and an open archive of the prompts behind each scene.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
