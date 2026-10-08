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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#090d10' },
    { media: '(prefers-color-scheme: light)', color: '#eef1f3' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
};

// Applies the saved interface theme before the first paint, so a light-theme
// reader never sees a dark flash. Reads the same key the preferences store writes.
const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem('tempest-atlas.preferences.v3')||'{}').state||{};var d=document.documentElement;d.dataset.uiTheme=p.uiTheme==='light'?'light':'dark';d.style.colorScheme=d.dataset.uiTheme;if(p.themeCursor!==false)d.classList.add('theme-cursor');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-ui-theme="dark" suppressHydrationWarning className={`${ui.variable} ${mono.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="bg-ink-900 font-ui text-fg antialiased">{children}</body>
    </html>
  );
}
