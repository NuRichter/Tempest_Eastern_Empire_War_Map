'use client';

import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { msg, useT } from '@/i18n';
import { useSimulation } from '@/simulation/store';

const KEYS: [string, string][] = [
  ['Space', msg('Play / pause')],
  ['← →', msg('Back / forward one simulated hour')],
  ['Shift + ← →', msg('Back / forward one day')],
  ['[ ]', msg('Previous / next event')],
  [', .', msg('Back / forward one 10-minute keyframe')],
  ['1 – 8', msg('Playback speed (0.25× to 48×)')],
  ['/ or Ctrl+K', msg('Search and commands')],
  ['G', msg('Flat atlas / globe')],
  ['M', msg('Base Map / Myth Map')],
  ['V', msg('3D view')],
  ['N', msg('Music on / off')],
  ['L', msg('Legend')],
  ['C', msg('Cinematic mode')],
  ['0', msg('Frame the whole campaign')],
  ['B', msg('Bookmark the current moment')],
  ['Esc', msg('Close, deselect, leave cinematic mode')],
  ['?', msg('This dialog')],
];

/** Puts elements into a translated sentence at its {name} placeholders. */
function fill(text: string, parts: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((piece, i) => {
    const key = piece.slice(1, -1);
    return <Fragment key={i}>{/^\{\w+\}$/.test(piece) && key in parts ? parts[key] : piece}</Fragment>;
  });
}

/** About the project and its rules, plus keyboard shortcuts. */
export function HelpDialog() {
  const open = useSimulation((s) => s.helpOpen);
  const setOpen = useSimulation((s) => s.setHelpOpen);
  const data = useSimulation((s) => s.data);
  const ref = useRef<HTMLDivElement | null>(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/75 p-3" onMouseDown={() => setOpen(false)} role="presentation">
      <div ref={ref} tabIndex={-1} className="surface max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[5px] focus:outline-none" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-500 bg-ink-800 px-4 py-2.5">
          <h2 id="help-title" className="font-display text-lg font-semibold text-fg">{t('About this atlas')}</h2>
          <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center text-fg-3 hover:text-fg" aria-label={t('Close')}>
            <X size={15} />
          </button>
        </div>
        <div className="grid gap-5 p-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3 text-sm leading-relaxed text-fg-2">
            <p>
              {fill(t('An interactive campaign atlas of the {war} from the Tensura light novels (volumes 12–16), made by {author} as a fan dedication to the Tensura community.'), {
                war: <span className="text-fg">Tempest–Eastern Empire War</span>,
                author: <span className="text-fg">NuRichter Workspace</span>,
              })}
            </p>
            <p className="border-l-2 border-accent pl-3 text-fg">
              {t('This is a fan-made research and visualisation project. It is not official Tensura material and is not affiliated with the rights holders.')}
            </p>
            <p>
              {fill(t('Every event carries a provenance: {canonical}, {visual}, {inferred}, {reconstructed} or {unresolved}. Movement between known points may be interpolated, and is labelled. Nothing is invented as canon.'), {
                canonical: <em>{t('canonical')}</em>,
                visual: <em>{t('canonical with visual reconstruction')}</em>,
                inferred: <em>{t('inferred')}</em>,
                reconstructed: <em>{t('reconstructed')}</em>,
                unresolved: <em>{t('unresolved')}</em>,
              })}
            </p>
            <p>
              {t('The novels give no clock times or calendar dates. Battle days (D−, D+) count from first contact. Every HH:MM is a simulation placement on a 10-minute grid, and the “year 9001” calendar is an artificial marker.')}
            </p>
            <p>
              {t('The map is a fictional world. Borders are traced from the supplied Base Map. Positions are simulation coordinates, never latitude and longitude. Unknown numbers stay unknown and are never shown as zero.')}
            </p>
            {data ? <p className="text-2xs text-fg-3">{t('Dataset revision: {revision}', { revision: data.manifest.revision })}</p> : null}
          </div>
          <div>
            <p className="eyebrow">{t('Keyboard')}</p>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {KEYS.map(([k, v]) => (
                  <tr key={k} className="border-t border-ink-500/60">
                    <td className="py-1.5 pr-3"><kbd className="whitespace-nowrap rounded-[2px] border border-ink-400 px-1 font-mono text-2xs text-fg">{k}</kbd></td>
                    <td className="py-1.5 text-fg-2">{t(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
