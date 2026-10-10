import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'BOTTOPIA · AI Creator Network', short_name: 'BOTTOPIA',
    description: '작품을 발견하고, 창작 도구를 사용하고, 함께 만드는 공간.',
    lang: 'ko', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#111318', theme_color: '#111318',
    icons: [
      { src: '/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '작품 올리기', url: '/studio' },
      { name: '창작 도구', url: '/tools' },
      { name: '커뮤니티', url: '/community' },
    ],
  };
}
