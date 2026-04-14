import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Verbatim - Privacy-First Transcription',
    template: '%s | Verbatim',
  },
  description:
    'High-accuracy transcription powered by multiple open-source STT engines. Your data never leaves our servers.',
  keywords: [
    'transcription',
    'speech-to-text',
    'audio transcription',
    'whisper',
    'privacy',
    'open-source',
  ],
  authors: [{ name: 'Verbatim' }],
  creator: 'Verbatim',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Verbatim',
    title: 'Verbatim - Privacy-First Transcription',
    description:
      'High-accuracy transcription powered by multiple open-source STT engines.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verbatim - Privacy-First Transcription',
    description:
      'High-accuracy transcription powered by multiple open-source STT engines.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#08080f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
