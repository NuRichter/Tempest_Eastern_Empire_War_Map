import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_Condensed, Source_Serif_4 } from 'next/font/google';
import './globals.css';

// Self-hosted at build time by next/font: no request leaves the page at runtime.
const ui = IBM_Plex_Sans_Condensed({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-ui', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });
const display = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Tempest–Eastern Empire War · Campaign Atlas',
  description:
    'A fan-made, research-led campaign atlas of the Tempest–Eastern Empire War from the Tensura light novels: ' +
    'time-aware territories, army sizes, movements and battles, with every reconstruction labelled. ' +
    'Not official Tensura material.',
  applicationName: 'Tempest–Eastern Empire War Campaign Atlas',
  authors: [{ name: 'NuRichter' }],
  creator: 'NuRichter Workspace',
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#090d10',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable} ${display.variable}`}>
      <body className="bg-ink-900 font-ui text-fg antialiased">{children}</body>
    </html>
  );
}
