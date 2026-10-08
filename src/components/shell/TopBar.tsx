'use client';

import { BookOpen, Film, HelpCircle, Languages, Moon, Search, Sun } from 'lucide-react';

import { columnAt } from '@/data/loader';
import { syncLocale, useI18n, useT } from '@/i18n';
import { LOCALES } from '@/i18n/locales';
import { battleDayLabel, phaseLabel } from '@/lib/format';
import { currentEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { ProvenanceBadge } from '@/components/ui/primitives';

/**
 * Masthead. Identity on the left, the campaign's state in the middle (where
 * the eye checks "when am I?"), tools on the right. One line, 44px.
 */
export function TopBar() {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const setPaletteOpen = useSimulation((s) => s.setPaletteOpen);
  const setViewMode = useSimulation((s) => s.setViewMode);
  const setLegendOpen = useSimulation((s) => s.setLegendOpen);
  const legendOpen = useSimulation((s) => s.legendOpen);
  const setHelpOpen = useSimulation((s) => s.setHelpOpen);
  const uiTheme = usePreferences((s) => s.uiTheme);
  const setPref = usePreferences((s) => s.set);
  const locale = useI18n((s) => s.loaded);
  const setLocale = useI18n((s) => s.setLocale);
  if (!data || !state) return null;

  const latest = currentEvent(data, frame);
  const day = data.timeline.battleDay[frame];

  return (
    <header className="relative z-30 flex h-11 shrink-0 items-center gap-2 border-b border-ink-500 bg-ink-850 px-2 sm:gap-3 sm:px-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="shrink-0 whitespace-nowrap font-display text-[15px] font-semibold tracking-wide text-fg">
          <span className="sm:hidden">Tempest War</span>
          <span className="hidden sm:inline">Tempest–Eastern Empire War</span>
        </h1>
        <span className="hidden whitespace-nowrap text-2xs uppercase tracking-label text-fg-3 2xl:inline">{t('Campaign Atlas · fan research')}</span>
      </div>

      <div className="mx-auto hidden min-w-0 items-center gap-3 md:flex">
        <span className="figure text-sm text-fg">{battleDayLabel(day)}</span>
        <span className="h-3 w-px bg-ink-400" aria-hidden />
        <span className="whitespace-nowrap text-sm text-fg-2">{t(phaseLabel(state.phase))}</span>
        {latest ? (
          <>
            <span className="h-3 w-px bg-ink-400" aria-hidden />
            <span className="hidden max-w-[22rem] truncate text-sm text-fg-2 xl:inline">{latest.title}</span>
            <span className="hidden xl:inline">
              <ProvenanceBadge value={latest.provenance} compact />
            </span>
          </>
        ) : null}
        <span className="hidden text-2xs text-fg-3 2xl:inline" title={data.manifest.clock.calendarNote}>
          {t('sim. calendar {date}', { date: columnAt(data.timeline.date, frame) })}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 md:ml-0">
        <button type="button" data-tour="search" onClick={() => setPaletteOpen(true)} className="ctl w-8 gap-2 px-0 sm:w-auto sm:min-w-[13rem] sm:justify-between sm:px-2.5 sm:pr-1.5" aria-label={t('Search and commands')} aria-keyshortcuts="/ Control+K">
          <span className="flex items-center gap-1.5">
            <Search size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">{t('Search the campaign')}</span>
          </span>
          <kbd className="hidden rounded-[2px] border border-ink-400 px-1 font-mono text-2xs text-fg-3 sm:inline">/</kbd>
        </button>
        <label data-tour="language" className="ctl relative w-8 px-0 sm:w-auto sm:px-2" title={t('Language')}>
          <Languages size={15} strokeWidth={1.7} aria-hidden />
          <span className="hidden max-w-[6.5rem] truncate text-xs lg:inline">{LOCALES.find((l) => l.code === locale)?.native ?? 'English'}</span>
          <select
            aria-label={t('Language')}
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value);
              void syncLocale();
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.native}
                {l.native !== l.english ? ` · ${l.english}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setPref('uiTheme', uiTheme === 'dark' ? 'light' : 'dark')}
          className="ctl w-8 px-0"
          aria-label={uiTheme === 'dark' ? t('Switch to the light theme') : t('Switch to the dark theme')}
          title={uiTheme === 'dark' ? t('Light theme') : t('Dark theme')}
        >
          {uiTheme === 'dark' ? <Sun size={15} strokeWidth={1.7} /> : <Moon size={15} strokeWidth={1.7} />}
        </button>
        <button type="button" onClick={() => setLegendOpen(!legendOpen)} aria-pressed={legendOpen} className="ctl hidden w-8 px-0 sm:inline-flex" aria-label={t('Map legend')} title={t('Legend (L)')}>
          <BookOpen size={15} strokeWidth={1.7} />
        </button>
        <button type="button" onClick={() => setViewMode('cinematic')} className="ctl w-8 px-0" aria-label={t('Cinematic mode')} title={t('Cinematic mode (C)')}>
          <Film size={15} strokeWidth={1.7} />
        </button>
        <button type="button" onClick={() => setHelpOpen(true)} className="ctl hidden w-8 px-0 sm:inline-flex" aria-label={t('About and keyboard shortcuts')} title={t('About and shortcuts (?)')}>
          <HelpCircle size={15} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
}
