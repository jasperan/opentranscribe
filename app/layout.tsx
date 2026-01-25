import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

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
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
