import { simToLngLat } from '@/lib/coords';
import { territoryControlAt } from '@/simulation/resolver';
import { getField } from '@/map/field/fieldStore';
import { haloText, type DrawContext } from '@/map/overlay/context';
import { translate } from '@/i18n';

/**
 * Fronts in the documentary register: the line where held ground meets held
 * ground, drawn as a thin white seam with a dark casing. The seam is the
 * contour of the synthesised occupation field, so it is RECONSTRUCTED.
 */
export function drawFronts(dc: DrawContext, toScreen: (x: number, y: number) => { sx: number; sy: number; occluded: boolean }): void {
  if (!dc.prefs.layers.occupation) return;
  const field = getField();
  if (!field || field.seams.length === 0) return;
  const { ctx } = dc;
  const s = field.seams;
  ctx.save();
  ctx.lineCap = 'round';
  const trace = () => {
    ctx.beginPath();
    for (let i = 0; i < s.length; i += 4) {
      const a = toScreen(s[i], s[i + 1]);
      const b = toScreen(s[i + 2], s[i + 3]);
      if (a.occluded || b.occluded) continue;
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
  };
  const w = Math.min(2.2, 0.9 + dc.zoom * 0.22);
  // One path, stroked twice: casing, then the seam.
  trace();
  ctx.strokeStyle = dc.theme.seamCasing;
  ctx.lineWidth = w + 2;
  ctx.stroke();
  ctx.strokeStyle = dc.theme.seam;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** Labels a territory whose control is changing on a reconstructed basis. */
export function drawControlChangeLabels(dc: DrawContext): void {
  if (!dc.prefs.layers.territories) return;
  const { ctx } = dc;
  for (const t of dc.data.territories) {
    const c = territoryControlAt(t, dc.frame);
    if (!c.previous || c.transition >= 1) continue;
    const reconstructed = c.segment.provenance !== 'CANONICAL';
    if (!reconstructed) continue;
    const p = dc.project(t.labelPoint[0], t.labelPoint[1] + 0.02);
    if (!dc.onScreen(p, 0)) continue;
    const size = Math.round(10 * dc.labelScale);
    ctx.font = `700 ${size}px ${dc.fonts.mono}`;
    const text = translate('RECONSTRUCTED CONTROL CHANGE');
    const w = ctx.measureText(text).width;
    ctx.globalAlpha = 0.4 + 0.6 * Math.sin(Math.PI * c.transition);
    haloText(ctx, text, p.sx - w / 2, p.sy, dc.theme.accent, dc.theme.halo, 3);
    ctx.globalAlpha = 1;
    dc.labels.reserve(p.sx - w / 2, p.sy - size, w, size + 4);
  }
}

/** A projector for simulation points: affine in the flat atlas, exact on the globe. */
export function makeProjector(map: { project: (ll: [number, number]) => { x: number; y: number } }, globe: boolean, fallback: DrawContext['project']) {
  if (globe) return fallback;
  // In the flat projection simulation space maps to the screen affinely
  // (x is linear in longitude, y linear in Mercator y), so three points define it.
  const o = map.project(toLL(0, 0));
  const ex = map.project(toLL(1, 0));
  const ey = map.project(toLL(0, 1));
  return (x: number, y: number) => ({
    sx: o.x + (ex.x - o.x) * x + (ey.x - o.x) * y,
    sy: o.y + (ex.y - o.y) * x + (ey.y - o.y) * y,
    occluded: false,
  });
}

function toLL(x: number, y: number): [number, number] {
  const { lng, lat } = simToLngLat(x, y);
  return [lng, lat];
}
