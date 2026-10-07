import { msg } from '@/i18n/msg';

/**
 * The About panel's content. Every link here was opened and checked on
 * 8 October 2026 (docs/research/LINKS_VERIFIED.json has the evidence); links
 * that could not be confirmed (streaming pages, the fan wiki, an official
 * anime YouTube channel) are left out on purpose.
 */

export const RETRIEVED = '2026-10-08';

/** The creator's own words, kept verbatim; the translated line sits beside it. */
export const CREATOR_MESSAGE = 'Semoga tim produksi Tensura bisa melihat proyekku ini suatu hari nanti.';
export const CREATOR_MESSAGE_EN = msg('I hope the Tensura production team gets to see this project of mine someday.');

export interface AboutLink {
  label: string;
  url: string;
  note?: string;
}

export const CREATOR_LINKS: AboutLink[] = [
  { label: 'GitHub · NuRichter', url: 'https://github.com/NuRichter' },
  { label: 'NuRichter Workspace', url: 'https://nurichter-workspace.vercel.app/' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/nurichter/' },
  { label: 'Instagram · @ibnu_lpg', url: 'https://www.instagram.com/ibnu_lpg/' },
  { label: 'YouTube · @NuRichter', url: 'https://www.youtube.com/@NuRichter' },
];

export const PROJECT_LINKS: AboutLink[] = [
  { label: msg('Source code on GitHub'), url: 'https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map' },
  { label: msg('Live site'), url: 'https://tempestwar.vercel.app/' },
];

export const OFFICIAL_LINKS: { group: string; links: AboutLink[] }[] = [
  {
    group: msg('Anime'),
    links: [
      { label: 'ten-sura.com', url: 'https://www.ten-sura.com/', note: msg('Official portal (Japanese)') },
      { label: msg('TV anime page'), url: 'https://www.ten-sura.com/anime/tensura' },
      { label: 'X · @ten_sura_anime', url: 'https://x.com/ten_sura_anime' },
      { label: 'Instagram · @tensura_official', url: 'https://www.instagram.com/tensura_official/' },
      { label: 'TikTok · @ten_sura_anime', url: 'https://www.tiktok.com/@ten_sura_anime' },
    ],
  },
  {
    group: msg('Light novel'),
    links: [
      { label: msg('Novel page (Micro Magazine)'), url: 'https://www.ten-sura.com/novel/tensura' },
      { label: 'GC Novels 12', url: 'https://gcnovels.jp/book/112' },
      { label: 'GC Novels 13', url: 'https://gcnovels.jp/book/136' },
      { label: 'GC Novels 14', url: 'https://gcnovels.jp/book/157' },
      { label: 'GC Novels 15', url: 'https://gcnovels.jp/book/590' },
      { label: 'GC Novels 16', url: 'https://gcnovels.jp/book/628' },
      { label: msg('Yen Press (English edition)'), url: 'https://yenpress.com/series/that-time-i-got-reincarnated-as-a-slime-light-novel' },
      { label: msg('Original web novel (Shōsetsuka ni Narō)'), url: 'https://ncode.syosetu.com/n6316bn/' },
    ],
  },
  {
    group: msg('Manga'),
    links: [
      { label: msg('Manga page (portal)'), url: 'https://www.ten-sura.com/comic/tensura' },
      { label: msg('Kodansha series page'), url: 'https://www.kodansha.co.jp/titles/1000026036' },
      { label: msg('Monthly Shōnen Sirius'), url: 'https://www.kodansha.co.jp/comic/labels/shonen-sirius' },
      { label: msg('Read chapter 1 free (Magazine Pocket)'), url: 'https://pocket.shonenmagazine.com/title/00380/episode/185457' },
    ],
  },
];

export interface Reference {
  /** APA 7 entry; *asterisks* mark the italic part. */
  apa: string;
  url?: string;
}

export const REFERENCES: { group: string; items: Reference[] }[] = [
  {
    group: msg('Primary sources'),
    items: [
      { apa: 'Fuse. (2021). *That time I got reincarnated as a slime* (Vol. 12; M. Vah, Illus.; K. Gifford, Trans.). Yen On. (Original work published 2018)' },
      { apa: 'Fuse. (2022). *That time I got reincarnated as a slime* (Vol. 13; M. Vah, Illus.; K. Gifford, Trans.). Yen On. (Original work published 2018)' },
      { apa: 'Fuse. (2022). *That time I got reincarnated as a slime* (Vol. 14; M. Vah, Illus.; K. Gifford, Trans.). Yen On. (Original work published 2019)' },
      { apa: 'Fuse. (2022). *That time I got reincarnated as a slime* (Vol. 15; M. Vah, Illus.; K. Gifford, Trans.). Yen On. (Original work published 2019)' },
      { apa: 'Fuse. (2023). *That time I got reincarnated as a slime* (Vol. 16; M. Vah, Illus.; K. Gifford, Trans.). Yen On. (Original work published 2020)' },
      { apa: 'Fuse. (2013–2016). *Tensei shitara suraimu datta ken* [That time I got reincarnated as a slime]. Shōsetsuka ni Narō.', url: 'https://ncode.syosetu.com/n6316bn/' },
      { apa: 'Kondō, B. (Executive Producer). (2018–present). *Tensei shitara suraimu datta ken* [That time I got reincarnated as a slime] [TV series]. Eight Bit; Tensura Production Committee.' },
    ],
  },
  {
    group: msg('Map animation references'),
    items: [
      { apa: 'k manager. (2025, January 13). *Russian invade Ukraine war every day to January 12th 2025 using Christopher style* [Video]. YouTube.', url: 'https://www.youtube.com/watch?v=8gUi4-nCBsQ' },
      { apa: 'mapsinanutshell. (2023, July 20). *The Korean War using Google Earth [Extended]* [Video]. YouTube.', url: 'https://www.youtube.com/watch?v=lJx6M7SqkvI' },
      { apa: 'Italian Mapper. (2024, June 19). *World War II every front with army sizes* [Video]. YouTube.', url: 'https://www.youtube.com/watch?v=nPFk_64JKZ8' },
      { apa: 'AlterGhz. (2026, May 3). *World War III every day Operation Unthinkable with army sizes* [Video]. YouTube.', url: 'https://www.youtube.com/watch?v=vOYKWBOB5fw' },
    ],
  },
  {
    group: msg('Software'),
    items: [
      { apa: 'MapLibre contributors. (2026). *MapLibre GL JS* (Version 5.24.0) [Computer software]. MapLibre.', url: 'https://maplibre.org/maplibre-gl-js/docs/' },
      { apa: 'Vercel. (2026). *Next.js* (Version 15.5.25) [Computer software].', url: 'https://nextjs.org/docs' },
      { apa: 'Meta Platforms. (2024). *React* (Version 19.0.0) [Computer software].', url: 'https://react.dev/' },
      { apa: 'Poimandres. (2026). *Zustand* (Version 5.0.15) [Computer software].', url: 'https://zustand.docs.pmnd.rs/' },
      { apa: 'Tailwind Labs. (2025). *Tailwind CSS* (Version 3.4.19) [Computer software].', url: 'https://tailwindcss.com/docs' },
      { apa: 'Google. (2026). *Puppeteer* (Version 25.10.0) [Computer software].', url: 'https://pptr.dev/' },
      { apa: 'Microsoft. (n.d.). *Playwright* [Computer software].', url: 'https://playwright.dev/' },
      { apa: 'OpenCV team. (2026). *OpenCV* (Version 4.14.0) [Computer software].', url: 'https://opencv.org/' },
      { apa: 'FFmpeg developers. (2026). *FFmpeg* [Computer software].', url: 'https://ffmpeg.org/' },
      { apa: 'Artifex Software. (2026). *PyMuPDF* (Version 1.28.2) [Computer software].', url: 'https://pymupdf.readthedocs.io/en/latest/' },
      { apa: 'Vercel. (n.d.). *Deployment protection*. Vercel Documentation. Retrieved October 8, 2026, from', url: 'https://vercel.com/docs/deployment-protection' },
    ],
  },
];
