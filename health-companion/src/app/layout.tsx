import type { Metadata, Viewport } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health Care Companion',
  description: 'Personal health assistant for Papa — medicines, sugar, BP, reminders and care.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Papa Health',
  },
};

export const viewport: Viewport = {
  themeColor: '#1d6fd1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let darkMode = false;
  let fontScale = 'large';
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('dark_mode, font_scale')
      .eq('id', 1)
      .single();
    if (data) {
      darkMode = data.dark_mode;
      fontScale = data.font_scale;
    }
  } catch {
    // Not signed in / DB unreachable — use defaults.
  }

  return (
    <html lang="hi" className={darkMode ? 'dark' : ''} data-font={fontScale}>
      <body className="min-h-dvh">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
