import { FACTION_DEEP, FACTION_PALE, factionKey, INK } from '@/lib/palette';
import { territoryControlAt } from '@/simulation/resolver';
import { haloText, isSelected, type DrawContext } from '@/map/overlay/context';
import { ROLE_LABEL } from '@/lib/taxonomy';
import { translate } from '@/i18n';

/**
 * Scale-aware geographic labels.
 *   zoomed out: nations only, sized by area, belligerents brighter
 *   mid zoom:   nations + active theatre codes
 *   zoomed in:  places named by the gazetteer, with their placement grade implied by weight
 */
export function drawGeographyLabels(dc: DrawContext): void {
  const { ctx, data, zoom, labels, labelScale } = dc;
  if (!dc.prefs.layers.labels) return;

  /* -- nations -------------------------------------------------- */
  if (zoom < 6.2) {
    const ordered = [...data.territories].sort((a, b) => b.areaFraction - a.areaFraction);
    for (const t of ordered) {
      const { segment } = territoryControlAt(t, dc.frame);
      const involved = segment.role !== 'UNINVOLVED';
      if (!involved && zoom < 2.2 && t.areaFraction < 0.02) continue;
      const p = dc.project(t.labelPoint[0], t.labelPoint[1]);
      if (!dc.onScreen(p, 0)) continue;
      const base = 9 + Math.sqrt(t.areaFraction) * 40;
      const size = Math.round(Math.min(18, Math.max(10, base * (0.7 + zoom * 0.12))) * labelScale);
      const text = t.display.toUpperCase();
      ctx.font = `600 ${size}px ${dc.fonts.ui}`;
      ctx.letterSpacing = `${Math.round(size * 0.14)}px`;
      const w = ctx.measureText(text).width;
      const x = p.sx - w / 2;
      const y = p.sy;
      if (!labels.place(x - 4, y - size, w + 8, size + 6)) {
        ctx.letterSpacing = '0px';
        continue;
      }
      const selected = isSelected(dc.selection, 'territory', t.id);
      const color = selected ? dc.theme.accent : involved ? (dc.prefs.theme === 'documentary' ? FACTION_DEEP[factionKey(segment.controller)] : FACTION_PALE[factionKey(segment.controller)]) : dc.theme.labelDim;
      ctx.globalAlpha = involved ? 0.92 : 0.6;
      haloText(ctx, text, x, y, color, dc.theme.halo, 3.5);
      ctx.globalAlpha = 1;
      ctx.letterSpacing = '0px';
      dc.hits.push({
        selection: { kind: 'territory', id: t.id },
        x: p.sx,
        y: p.sy - size / 2,
        r: Math.max(18, w / 2),
        title: t.name,
        detail: involved ? `${ROLE_LABEL[segment.role] ? translate(ROLE_LABEL[segment.role]) : segment.role.replace('_', '-').toLowerCase()} · ${segment.controller ?? ''}` : translate('Not involved in the campaign'),
        priority: 9,
      });
    }
  }

  /* -- theatres -------------------------------------------------- */
  if (zoom >= 3 && zoom < 6.4 && dc.state && dc.prefs.layers.operationalAreas) {
    for (const th of data.theatres) {
      const live = dc.state.theatres[th.id];
      if (!th.bounds || !live || live.status === 'INACTIVE') continue;
      const cx = (th.bounds[0] + th.bounds[2]) / 2;
      const cy = th.bounds[1];
      const p = dc.project(cx, cy);
      if (!dc.onScreen(p, 0)) continue;
      const size = Math.round(10 * labelScale);
      ctx.font = `600 ${size}px ${dc.fonts.mono}`;
      const text = `${th.code} · ${live.status.replace(/_/g, ' ')}`;
      const w = ctx.measureText(text).width;
      if (!labels.place(p.sx - w / 2 - 4, p.sy - size - 8, w + 8, size + 6)) continue;
      haloText(ctx, text, p.sx - w / 2, p.sy - 6, dc.theme.accent, dc.theme.halo, 3);
      dc.hits.push({ selection: { kind: 'theatre', id: th.id }, x: p.sx, y: p.sy - 10, r: Math.max(14, w / 2), title: th.name, detail: live.status.toLowerCase(), priority: 8 });
    }
  }

  /* -- places ---------------------------------------------------- */
  if (zoom >= 4.6) {
    const size = Math.round(11 * labelScale);
    for (const place of data.places) {
      if (place.x === null || place.y === null || place.placement === 'ABSTRACT') continue;
      // Tactical positions inside one battlefield appear only when zoomed right in.
      const tactical = /line|position|rally|start/i.test(place.name) && place.theatre === 'TH-DWG';
      if (tactical && zoom < 6.8) continue;
      const p = dc.project(place.x, place.y);
      if (!dc.onScreen(p, 0)) continue;
      ctx.font = `${place.placement === 'MEASURED' ? 600 : 500} ${size}px ${dc.fonts.ui}`;
      const w = ctx.measureText(place.name).width;
      const x = p.sx + 6;
      const y = p.sy + 14;
      if (!labels.place(x - 2, y - size, w + 4, size + 4)) continue;
      ctx.fillStyle = INK.text3;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 2, 0, Math.PI * 2);
      ctx.fill();
      haloText(ctx, place.name, x, y, place.placement === 'MEASURED' ? dc.theme.place : dc.theme.labelDim, dc.theme.halo, 3);
    }
  }
}
