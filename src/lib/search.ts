import type { Dataset } from '@/data/loader';
import { msg } from '@/i18n/msg';
import type { Selection } from '@/simulation/store';

export type ResultGroup = 'Characters' | 'Forces' | 'Battles' | 'Events' | 'Territories' | 'Theatres' | 'Places' | 'Movements';

/** Group headings as shown to the reader. The values equal the group ids, so they render as `t(group)`. */
export const RESULT_GROUP_LABEL: Record<ResultGroup, string> = {
  Characters: msg('Characters'),
  Forces: msg('Forces'),
  Battles: msg('Battles'),
  Events: msg('Events'),
  Territories: msg('Territories'),
  Theatres: msg('Theatres'),
  Places: msg('Places'),
  Movements: msg('Movements'),
};

export interface SearchItem {
  group: ResultGroup;
  selection: Exclude<Selection, { kind: 'none' }> | { kind: 'place'; id: string };
  title: string;
  detail: string;
  /** Lower-cased strings matched against: name first, then aliases. */
  keys: string[];
  frame?: number;
  portrait?: string | null;
  nationId?: string | null;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Builds the index once per dataset. Aliases from the terminology dictionary feed every matching entity. */
export function buildIndex(data: Dataset): SearchItem[] {
  const aliasFor = new Map<string, string[]>();
  for (const t of data.terms) {
    const all = [t.canonical, t.display, ...(t.japanese ? [t.japanese] : []), ...t.aliases];
    for (const a of all) aliasFor.set(fold(a), all);
  }
  const expand = (...names: string[]) => {
    const out = new Set<string>();
    for (const n of names) {
      if (!n) continue;
      out.add(fold(n));
      for (const a of aliasFor.get(fold(n)) ?? []) out.add(fold(a));
    }
    return [...out].filter(Boolean);
  };

  const items: SearchItem[] = [];
  for (const c of data.characters) {
    items.push({
      group: 'Characters',
      selection: { kind: 'character', id: c.id },
      title: c.name,
      detail: [c.faction, c.japanese].filter(Boolean).join(' · '),
      keys: [...expand(c.name, ...c.aliases), ...(c.japanese ? [c.japanese.toLowerCase()] : [])],
      portrait: c.photocard?.src ?? null,
    });
  }
  for (const f of data.forces) {
    items.push({ group: 'Forces', selection: { kind: 'force', id: f.id }, title: f.displayName, detail: `${f.faction} · ${f.commander}`, keys: expand(f.displayName, f.formation, f.army, f.id), nationId: data.factionById.get(f.faction)?.nationId ?? null });
  }
  for (const b of data.battles) {
    items.push({ group: 'Battles', selection: { kind: 'battle', id: b.id }, title: b.name, detail: data.theatreById.get(b.theatreId)?.name ?? b.theatreId, keys: expand(b.name, b.id), frame: b.startFrame });
  }
  for (const e of data.events) {
    items.push({ group: 'Events', selection: { kind: 'event', id: e.id }, title: e.title, detail: `${e.warDay} ${e.simulationTime} · ${e.theatre}`, keys: expand(e.title, e.id, e.location, e.actor), frame: e.frame });
  }
  for (const t of data.territories) {
    items.push({ group: 'Territories', selection: { kind: 'territory', id: t.id }, title: t.name, detail: t.display, keys: expand(t.name, t.display), nationId: t.nationId });
  }
  for (const t of data.theatres) {
    items.push({ group: 'Theatres', selection: { kind: 'theatre', id: t.id }, title: t.name, detail: `${t.code} · ${t.region}`, keys: expand(t.name, t.code, t.id, t.region) });
  }
  for (const p of data.places) {
    if (p.x === null) continue;
    items.push({ group: 'Places', selection: { kind: 'place', id: p.id }, title: p.name, detail: p.placement.toLowerCase(), keys: expand(p.name) });
  }
  for (const m of data.movements) {
    const f = data.forceById.get(m.forceId);
    items.push({ group: 'Movements', selection: { kind: 'movement', id: m.id }, title: `${f?.displayName ?? m.forceId}: ${m.from} → ${m.to}`, detail: `${m.type.toLowerCase()} · ${m.route.toLowerCase()}`, keys: expand(m.id, m.from, m.to, f?.displayName ?? ''), frame: m.startFrame ?? undefined });
  }
  return items;
}

/**
 * Scores a query against one key: exact > prefix > word prefix > substring >
 * subsequence (fuzzy, penalised by gaps). Zero means no match.
 */
export function scoreKey(q: string, key: string): number {
  if (!q) return 0;
  if (key === q) return 100;
  if (key.startsWith(q)) return 85 - Math.min(20, key.length - q.length) * 0.5;
  if (key.split(' ').some((w) => w.startsWith(q))) return 70;
  const at = key.indexOf(q);
  if (at >= 0) return 55 - Math.min(15, at * 0.5);
  // Subsequence with gap penalty: "clgr" finds "caligulio".
  let ki = 0;
  let gaps = 0;
  let last = -1;
  for (const ch of q) {
    const found = key.indexOf(ch, ki);
    if (found < 0) return 0;
    if (last >= 0) gaps += found - last - 1;
    last = found;
    ki = found + 1;
  }
  const score = 40 - gaps * 2 - (key.length - q.length) * 0.3;
  return score > 8 ? score : 0;
}

export function search(index: SearchItem[], query: string, limit = 40): SearchItem[] {
  const q = fold(query);
  if (q.length < 1) return [];
  const terms = q.split(' ');
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of index) {
    // Every word of the query must match some key.
    let total = 0;
    let ok = true;
    for (const t of terms) {
      let best = 0;
      for (const [i, k] of item.keys.entries()) best = Math.max(best, scoreKey(t, k) - (i > 0 ? 3 : 0));
      if (best === 0) {
        ok = false;
        break;
      }
      total += best;
    }
    if (ok) scored.push({ item, score: total / terms.length + (item.group === 'Characters' ? 4 : item.group === 'Forces' ? 2 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
}
