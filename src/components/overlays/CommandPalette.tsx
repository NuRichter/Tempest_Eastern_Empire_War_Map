'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

import { msg, useT } from '@/i18n';
import { buildIndex, MAX_QUERY_LENGTH, search, type SearchItem } from '@/lib/search';
import { useSimulation } from '@/simulation/store';
import { usePreferences, type WarLayer } from '@/state/preferences';
import { Flag } from '@/components/ui/primitives';

interface Command {
  id: string;
  title: string;
  hint?: string;
  keys: string[];
  run: () => void;
}

function useCommands(t: ReturnType<typeof useT>): Command[] {
  const s = useSimulation.getState;
  const p = usePreferences.getState;
  const layer = (id: WarLayer, name: string): Command => ({
    id: `layer-${id}`,
    title: t('Toggle {name}', { name: t(name) }),
    hint: t('layer'),
    keys: [`toggle ${name.toLowerCase()}`, `layer ${name.toLowerCase()}`, name.toLowerCase()],
    run: () => p().toggleLayer(id),
  });
  return [
    { id: 'play', title: t('Play / pause'), hint: 'Space', keys: ['play', 'pause'], run: () => s().toggle() },
    { id: 'next', title: t('Next event'), hint: ']', keys: ['next event', 'jump'], run: () => s().stepEvent(1) },
    { id: 'prev', title: t('Previous event'), hint: '[', keys: ['previous event', 'back'], run: () => s().stepEvent(-1) },
    { id: 'start', title: t('Go to campaign start'), keys: ['start', 'beginning', 'mobilization'], run: () => s().seek(0) },
    { id: 'contact', title: t('Go to first contact'), keys: ['first contact', 'battle start'], run: () => s().data && s().seek(s().data!.manifest.campaign.firstContactFrame) },
    { id: 'flat', title: t('Switch to flat atlas'), hint: 'G', keys: ['flat', 'mercator', 'map projection'], run: () => p().set('globe', false) },
    { id: 'globe', title: t('Switch to globe'), hint: 'G', keys: ['globe', '3d', 'projection'], run: () => p().set('globe', true) },
    { id: 'base', title: t('Switch to Base Map'), hint: 'M', keys: ['base map', 'map style', 'default map'], run: () => p().set('mapStyle', 'base') },
    { id: 'myth', title: t('Switch to Myth Map'), hint: 'M', keys: ['myth map', 'map style', 'painted'], run: () => p().set('mapStyle', 'myth') },
    { id: 'reset-camera', title: t('Reset camera to the campaign'), hint: '0', keys: ['reset camera', 'campaign view', 'home'], run: () => s().focusCampaign() },
    { id: 'legend', title: t('Open the legend'), hint: 'L', keys: ['legend', 'key', 'symbols'], run: () => s().setLegendOpen(true) },
    { id: 'cinematic', title: t('Enter cinematic mode'), hint: 'C', keys: ['cinematic', 'presentation', 'documentary'], run: () => s().setViewMode('cinematic') },
    { id: 'filters', title: t('Open filters'), keys: ['filter', 'faction', 'theatre'], run: () => s().setRailTab('filters') },
    { id: 'reset-filters', title: t('Reset all filters'), keys: ['reset filters', 'clear filters'], run: () => s().resetFilters() },
    { id: 'story', title: t('Open the campaign story'), keys: ['story', 'phases', 'guide'], run: () => s().setRailTab('story') },
    { id: 'help', title: t('Keyboard shortcuts & about'), hint: '?', keys: ['help', 'shortcuts', 'about'], run: () => s().setHelpOpen(true) },
    layer('territories', msg('Territories')),
    layer('movement', msg('Army movement')),
    layer('armySizes', msg('Army sizes')),
    layer('battles', msg('Battles')),
    layer('events', msg('Events')),
    layer('frontlines', msg('Frontlines')),
    layer('characters', msg('Character markers')),
    layer('labels', msg('Labels')),
  ];
}

const COMMANDS = msg('Commands');
const GROUP_ORDER = [COMMANDS, 'Characters', 'Forces', 'Battles', 'Events', 'Territories', 'Theatres', 'Places', 'Movements'];

/**
 * One box for everything: search across every named thing in the dataset
 * (with aliases and Japanese names) and the atlas's own commands.
 */
export function CommandPalette() {
  const open = useSimulation((s) => s.paletteOpen);
  const setOpen = useSimulation((s) => s.setPaletteOpen);
  const data = useSimulation((s) => s.data);
  const t = useT();
  const commands = useCommands(t);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const index = useMemo(() => (data ? buildIndex(data) : []), [data]);

  // Opening starts a fresh search (adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setCursor(0);
    }
  }
  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else restoreFocus.current?.focus?.();
  }, [open]);

  type Row = { group: string; key: string; title: string; detail?: string; hint?: string; item?: SearchItem; command?: Command };
  const rows = useMemo<Row[]>(() => {
    const q = query.slice(0, MAX_QUERY_LENGTH).trim().toLowerCase();
    const cmd = (q ? commands.filter((c) => c.title.toLowerCase().includes(q) || c.keys.some((k) => k.includes(q))) : commands.slice(0, 8)).map<Row>((c) => ({ group: COMMANDS, key: c.id, title: c.title, hint: c.hint, command: c }));
    const found = q ? search(index, q, 40).map<Row>((item) => ({ group: item.group, key: `${item.group}-${'id' in item.selection ? item.selection.id : ''}`, title: item.title, detail: item.detail, item })) : [];
    const all = [...cmd, ...found];
    return all.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [query, index, commands]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const choose = (row: Row) => {
    setOpen(false);
    if (row.command) {
      row.command.run();
      return;
    }
    const sel = row.item!.selection;
    const s = useSimulation.getState();
    switch (sel.kind) {
      case 'event': s.jumpToEvent(sel.id); break;
      case 'battle': s.jumpToBattle(sel.id); break;
      case 'force': s.jumpToForce(sel.id); break;
      case 'character': s.jumpToCharacter(sel.id); break;
      case 'territory': s.jumpToTerritory(sel.id); break;
      case 'theatre': s.jumpToTheatre(sel.id); break;
      case 'movement': s.jumpToMovement(sel.id); break;
      case 'place': {
        const p = data?.placeById.get(sel.id);
        if (p?.x != null && p.y != null) s.focusPoint(p.x, p.y, 5.6);
        break;
      }
      default: break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-3 pt-[10vh]" onMouseDown={() => setOpen(false)} role="presentation">
      <div className="surface w-full max-w-[40rem] overflow-hidden rounded-[5px]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Search and commands')}>
        <div className="flex items-center gap-2 border-b border-ink-500 px-3">
          <Search size={16} strokeWidth={1.8} className="shrink-0 text-fg-3" />
          <input
            ref={inputRef}
            value={query}
            maxLength={MAX_QUERY_LENGTH}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(rows.length - 1, c + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              else if (e.key === 'Enter' && rows[cursor]) choose(rows[cursor]);
              else if (e.key === 'Tab') e.preventDefault();
            }}
            placeholder={t('Search characters, forces, battles, events, places… or type a command')}
            aria-label={t('Search the campaign')}
            aria-controls="palette-results"
            aria-activedescendant={rows[cursor] ? `palette-row-${cursor}` : undefined}
            className="h-12 flex-1 bg-transparent text-base text-fg placeholder:text-fg-3 focus:outline-none"
          />
          <kbd className="rounded-[2px] border border-ink-400 px-1 font-mono text-2xs text-fg-3">esc</kbd>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-3">{t('Nothing in the record matches “{query}”. Try a name, an alias (e.g. Nazca), or a Japanese name.', { query })}</p>
        ) : (
          <ul ref={listRef} id="palette-results" role="listbox" className="max-h-[56vh] overflow-y-auto py-1">
            {rows.map((row, i) => {
              const header = i === 0 || row.group !== rows[i - 1].group;
              return (
                <li key={row.key + i} role="presentation">
                  {header ? <p className="eyebrow px-3 pb-1 pt-2">{t(row.group)}</p> : null}
                  <button
                    type="button"
                    id={`palette-row-${i}`}
                    role="option"
                    aria-selected={i === cursor}
                    data-index={i}
                    onMouseMove={() => setCursor(i)}
                    onClick={() => choose(row)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left ${i === cursor ? 'bg-accent/12 bg-ink-600' : ''}`}
                  >
                    {row.item?.portrait ? (
                      <img src={row.item.portrait} alt="" className="h-7 w-7 shrink-0 rounded-full border border-ink-400 bg-white object-cover object-top" />
                    ) : row.item?.nationId !== undefined && row.item?.nationId !== null ? (
                      <Flag nationId={row.item.nationId} size={12} />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{row.title}</span>
                      {row.detail ? <span className="block truncate text-2xs text-fg-3">{row.detail}</span> : null}
                    </span>
                    {row.hint ? <kbd className="shrink-0 rounded-[2px] border border-ink-400 px-1 font-mono text-2xs text-fg-3">{row.hint}</kbd> : null}
                    {i === cursor ? <CornerDownLeft size={13} className="shrink-0 text-fg-3" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-ink-500 px-3 py-1.5 text-2xs text-fg-3">{t('↑↓ to move · Enter to open · results move the timeline and the camera to the record')}</p>
      </div>
    </div>
  );
}
