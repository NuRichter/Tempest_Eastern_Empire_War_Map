import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Cinzel, IBM_Plex_Mono, IBM_Plex_Sans_Condensed, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from './site';
import { TRUSTED_TYPES_BOOT } from '@/security/trusted-types';

// Self-hosted at build time by next/font: no request leaves the page at runtime.
const ui = IBM_Plex_Sans_Condensed({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-ui', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });
const display = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-display', display: 'swap' });
// Title face of cinematic mode only: not preloaded, so the atlas does not pay for it.
const cine = Cinzel({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-cine', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: 'NuRichter', url: 'https://github.com/NuRichter' }],
  creator: 'NuRichter Workspace',
  publisher: 'NuRichter Workspace',
  category: 'entertainment',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_GB',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Tempest vs the Eastern Empire, the Tensura war map in 3D' }],
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION, images: ['/og.jpg'] },
  // Google Search Console ownership: set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION on Vercel to the token Google gives.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

// Structured data: tells search engines what the page is (a fan-made interactive map of the novels' war).
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, alternateName: ['Tempest War Map', 'Tempest Eastern Empire War Map'], description: SITE_DESCRIPTION, inLanguage: 'en' },
    {
      '@type': ['WebApplication', 'Map'],
      '@id': `${SITE_URL}/#atlas`,
      name: SITE_TITLE,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      image: `${SITE_URL}/og.jpg`,
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Any (web browser)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'NuRichter', url: 'https://github.com/NuRichter' },
      isBasedOn: { '@type': 'BookSeries', name: 'That Time I Got Reincarnated as a Slime', alternateName: 'Tensei Shitara Slime Datta Ken', author: { '@type': 'Person', name: 'Fuse' } },
      about: ['Tempest–Eastern Empire War', 'Jura Tempest Federation', 'Eastern Empire'],
      isAccessibleForFree: true,
      disambiguatingDescription: 'Fan-made research map. Not official Tensura material.',
    },
  ],
};
// Escaped so no string in it can close the script element.
const JSON_LD_HTML = JSON.stringify(JSON_LD).replace(/</g, '\\u003c');

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
    <html lang="en" data-ui-theme="dark" suppressHydrationWarning className={`${ui.variable} ${mono.variable} ${display.variable} ${cine.variable}`}>
      <head>
        {/* First: the Trusted Types default policy, before any library can reach a sink. */}
        <script dangerouslySetInnerHTML={{ __html: TRUSTED_TYPES_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD_HTML }} />
      </head>
      <body className="bg-ink-900 font-ui text-fg antialiased">
        {children}
        {/* Vercel Web Analytics: cookieless page views, served from this origin (/_vercel/insights),
            so the CSP and Trusted Types need no exception. Only on Vercel, where that route exists. */}
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
