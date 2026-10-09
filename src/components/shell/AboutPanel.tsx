'use client';

import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import { CREATOR_LINKS, CREATOR_MESSAGE, CREATOR_MESSAGE_EN, OFFICIAL_LINKS, PROJECT_LINKS, REFERENCES, WALLPAPERS, type AboutLink } from '@/content/about';
import { useI18n, useT } from '@/i18n';
import { MUSIC_CREDITS } from '@/audio/music';
import { Section } from '@/components/ui/primitives';

/**
 * Who made this and why, the official places to support the series, and the
 * references in APA 7. Links open in a new tab; only verified ones are listed.
 */
export function AboutPanel() {
  const t = useT();
  const locale = useI18n((s) => s.loaded);
  return (
    <div>
      <section className="px-3 pb-3 pt-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{t('A fan project')}</p>
            <h3 className="mt-1 font-display text-lg leading-snug text-fg">{t('Hi, I’m NuRichter.')}</h3>
          </div>
          <img src="/assets/theme/chibi/slime-mitz-vah.webp" alt="" width={84} height={64} className="h-16 w-auto shrink-0 -rotate-3" />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          {t('I love the Tempest–Eastern Empire war arc, so I read volumes 12 to 16 again with a notebook open and turned the war into a map you can play like a documentary. Every movement, battle and loss is placed from the novels. Where the books are silent, the map says so.')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          {t('This is not official Tensura material. It is made for fun, for other fans, and as a thank-you to the people who made the story.')}
        </p>
        <blockquote className="mt-3 rounded-[3px] border-l-2 border-accent bg-ink-700/60 px-3 py-2">
          <p lang="id" className="text-sm italic leading-relaxed text-fg">“{CREATOR_MESSAGE}”</p>
          {locale !== 'id' ? <p className="mt-1 text-xs leading-relaxed text-fg-3">{t(CREATOR_MESSAGE_EN)}</p> : null}
          <p className="mt-1 text-2xs uppercase tracking-label text-fg-3">NuRichter</p>
        </blockquote>
      </section>

      <Section title={t('Wallpapers')}>
        <p className="mb-2 text-xs leading-relaxed text-fg-3">{t('The five covers of this war’s volumes, made into wallpapers, plus two moments from the map. Tap to save.')}</p>
        <ul className="grid grid-cols-4 gap-2">
          {WALLPAPERS.map((w) => (
            <li key={w.desktop} className="flex flex-col gap-1">
              <a href={w.desktop} download className="block overflow-hidden rounded-[3px] border border-ink-500 hover:border-accent" title={w.credit}>
                <img src={w.thumb} alt={w.title} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </a>
              <span className="text-center text-2xs text-fg-2">{w.title}</span>
              <span className="flex justify-center gap-1.5 text-2xs">
                <a href={w.desktop} download className="text-accent hover:underline">{t('Desktop')}</a>
                {w.phone ? (
                  <a href={w.phone} download className="text-accent hover:underline">{t('Phone')}</a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-2xs leading-relaxed text-fg-3">{t('Cover art © Fuse, Mitz Vah and Micro Magazine. For your own screens only.')}</p>
      </Section>

      <Section title={t('Music')} defaultOpen={false}>
        <p className="mb-2 text-xs leading-relaxed text-fg-3">{t('Free-licensed fantasy music from OpenGameArt. Not the official Tensura soundtrack.')}</p>
        <ul className="space-y-1.5">
          {MUSIC_CREDITS.map((m) => (
            <li key={m.file} className="text-xs leading-relaxed text-fg-2">
              <a href={m.source} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">{m.title}</a>
              <span className="text-fg-3"> · {m.author} · {m.license}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('Find me')}>
        <LinkList links={[...CREATOR_LINKS, ...PROJECT_LINKS]} />
      </Section>

      <Section title={t('Support the official series')}>
        <p className="mb-2 text-xs leading-relaxed text-fg-3">{t('If this map made you want more Tensura, these are the official homes of the novels, manga and anime.')}</p>
        {OFFICIAL_LINKS.map((g) => (
          <div key={g.group} className="mb-2">
            <p className="eyebrow mb-0.5">{t(g.group)}</p>
            <LinkList links={g.links} />
          </div>
        ))}
      </Section>

      <Section title={t('References')} defaultOpen={false}>
        {REFERENCES.map((g) => (
          <div key={g.group} className="mb-3">
            <p className="eyebrow mb-1">{t(g.group)}</p>
            <ul className="space-y-1.5">
              {g.items.map((r) => (
                <li key={r.apa} className="pl-4 -indent-4 text-xs leading-relaxed text-fg-2">
                  {apa(r.apa)}{' '}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer noopener" className="break-all text-accent hover:underline">
                      {r.url}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-2xs leading-relaxed text-fg-3">{t('Links checked on 8 October 2026. Characters, names and story belong to Fuse, Mitz Vah, Micro Magazine, Kodansha and the anime production committee.')}</p>
      </Section>
    </div>
  );
}

function LinkList({ links }: { links: AboutLink[] }) {
  const t = useT();
  return (
    <ul className="space-y-px">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 rounded-[3px] px-1.5 py-1 text-xs text-fg hover:bg-ink-700/60">
            <span className="flex-1 truncate">
              {t(l.label)}
              {l.note ? <span className="text-fg-3"> · {t(l.note)}</span> : null}
            </span>
            <ExternalLink size={12} strokeWidth={1.8} className="shrink-0 text-fg-3" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Renders *italic* spans of an APA entry. */
function apa(text: string): ReactNode[] {
  return text.split(/(\*[^*]+\*)/g).map((part, i) => (part.startsWith('*') ? <i key={i}>{part.slice(1, -1)}</i> : part));
}
