import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Healthcare App',
    short_name: 'Healthcare',
    description:
      'Personal health assistant for Papa — medicines, sugar, BP, reminders and daily care.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#eef6fc',
    theme_color: '#1d6fd1',
    orientation: 'portrait',
    categories: ['health', 'medical', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
