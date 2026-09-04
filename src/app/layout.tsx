import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tempest–Eastern Empire War · Campaign Atlas',
  description:
    'An interactive reconstruction of the Tempest–Eastern Empire War: fifty campaign days, ' +
    'six theatres and 7,200 keyframes of battlefield state, drawn from a canonical Step 1 dataset.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0a0d0e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-900 font-ui antialiased">{children}</body>
    </html>
  );
}
