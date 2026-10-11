/**
 * 3D counterparts of the 2D map symbols, so both views read the same way.
 *
 *   force tokens     the 2D marker as a game piece: a plinth in the faction's
 *                    shape (square Empire, round Tempest, diamond Dwargon,
 *                    triangle others), its deep colour with a rim in the faction
 *                    colour, and the unit symbol raised on top (infantry cross,
 *                    armour track, spinning air propeller, cavalry slash, elite
 *                    star, mage spark, undead cross, construct frame, reserve
 *                    double ring, command pennant; a plain pip when the
 *                    composition is not recorded)
 *   strategic models halt flag, gatehouse, border chevron, objective target,
 *                    staging block, camp tent: the 2D strategic points in relief
 *   standees         2.5D: a character's photocard as an upright card on a
 *                    round stand, always turned to the camera (paper-theatre style)
 *
 * Geometry and materials are shared and cached; everything here is created on
 * demand and disposed by the scene traversal in Atlas3D.
 */
import * as THREE from 'three';

import { FACTION_COLOR, FACTION_DEEP, FACTION_PALE, FACTION_SHAPE, type ColorKey } from '@/lib/palette';
import type { UnitClass } from '@/lib/units';
import type { Place } from '@/types/dataset';

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

function factionShape(key: ColorKey, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const kind = FACTION_SHAPE[key];
  const poly = (pts: [number, number][]) => {
    s.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
    s.closePath();
  };
  // Shape y points north on the map (the token is rotated so +y becomes -z).
  if (kind === 'square') poly([[-r * 0.88, -r * 0.88], [r * 0.88, -r * 0.88], [r * 0.88, r * 0.88], [-r * 0.88, r * 0.88]]);
  else if (kind === 'circle') s.absarc(0, 0, r, 0, Math.PI * 2, false);
  else if (kind === 'diamond') poly([[0, r * 1.15], [r * 1.15, 0], [0, -r * 1.15], [-r * 1.15, 0]]);
  else if (kind === 'triangle') poly([[0, r * 1.15], [r * 1.05, -r * 0.75], [-r * 1.05, -r * 0.75]]);
  else poly(Array.from({ length: 6 }, (_, i) => [Math.cos(Math.PI / 6 + (i * Math.PI) / 3) * r, Math.sin(Math.PI / 6 + (i * Math.PI) / 3) * r] as [number, number]));
  return s;
}

function star(points: number, outer: number, inner: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let k = 0; k < points * 2; k += 1) {
    const a = Math.PI / 2 + (k * Math.PI) / points;
    const rr = k % 2 ? inner : outer;
    if (k) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

const flat = (shape: THREE.Shape, depth: number, bevel = 0.04) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 28 });
  g.rotateX(-Math.PI / 2); // lie on the ground, extruded upwards
  return g;
};

/* ------------------------------------------------------------------ */
/* Caches                                                              */
/* ------------------------------------------------------------------ */

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();
const geo = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};
const mat = <M extends THREE.Material>(key: string, make: () => M): M => {
  let m = matCache.get(key) as M | undefined;
  if (!m) {
    m = make();
    matCache.set(key, m);
  }
  return m;
};
/** Shared resources survive token removal; they are released once, with the scene. */
export function disposeTokenCaches(): void {
  for (const g of geoCache.values()) g.dispose();
  for (const m of matCache.values()) m.dispose();
  geoCache.clear();
  matCache.clear();
  for (const t of cardCache.values()) t.then((x) => x.dispose(), () => undefined);
  cardCache.clear();
}

const PLINTH = 0.32;

/* ------------------------------------------------------------------ */
/* Force tokens                                                        */
/* ------------------------------------------------------------------ */

export interface ForceToken {
  group: THREE.Group;
  /** Parts that animate: the spinning propeller, the heading chevron, the selection halo. */
  spin: THREE.Object3D | null;
  heading: THREE.Mesh;
  halo: THREE.Mesh;
  body: THREE.Mesh[];
}

function glyph(cls: UnitClass, color: THREE.Material): { obj: THREE.Object3D; spin: THREE.Object3D | null } {
  const g = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geometry, color);
    m.position.set(x, y, z);
    m.rotation.set(0, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const bar = geo('bar', () => new THREE.BoxGeometry(0.95, 0.12, 0.13));
  let spin: THREE.Object3D | null = null;
  switch (cls) {
    case 'infantry':
      add(bar, 0, 0.06, 0, Math.PI / 4);
      add(bar, 0, 0.06, 0, -Math.PI / 4);
      break;
    case 'armor': {
      const t = add(geo('track', () => new THREE.TorusGeometry(0.4, 0.07, 10, 40)), 0, 0.07);
      t.rotation.x = Math.PI / 2;
      t.scale.set(1, 0.55, 1);
      break;
    }
    case 'air': {
      const hub = new THREE.Group();
      const blade = geo('blade', () => new THREE.BoxGeometry(0.9, 0.04, 0.16));
      for (let k = 0; k < 3; k += 1) {
        const b = new THREE.Mesh(blade, color);
        b.rotation.y = (k * Math.PI * 2) / 3;
        b.position.set(Math.cos((k * Math.PI * 2) / 3) * 0.0, 0, 0);
        b.castShadow = true;
        hub.add(b);
      }
      hub.position.y = 0.32;
      g.add(hub);
      add(geo('mast', () => new THREE.CylinderGeometry(0.05, 0.05, 0.32, 10)), 0, 0.16);
      spin = hub;
      break;
    }
    case 'cavalry':
      add(geo('slash', () => new THREE.BoxGeometry(1.15, 0.12, 0.14)), 0, 0.06, 0, Math.PI / 4);
      break;
    case 'elite':
      add(geo('star', () => flat(star(5, 0.48, 0.2), 0.12, 0.02)));
      break;
    case 'mage':
      add(geo('spark', () => flat(star(4, 0.5, 0.14), 0.12, 0.02)));
      break;
    case 'undead':
      add(geo('crossV', () => new THREE.BoxGeometry(0.14, 0.12, 0.9)), 0, 0.06);
      add(geo('crossH', () => new THREE.BoxGeometry(0.62, 0.12, 0.14)), 0, 0.06, -0.18);
      break;
    case 'construct': {
      const sq = new THREE.Shape();
      sq.moveTo(-0.38, -0.38); sq.lineTo(0.38, -0.38); sq.lineTo(0.38, 0.38); sq.lineTo(-0.38, 0.38); sq.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-0.24, -0.24); hole.lineTo(-0.24, 0.24); hole.lineTo(0.24, 0.24); hole.lineTo(0.24, -0.24); hole.closePath();
      sq.holes.push(hole);
      add(geo('frame', () => flat(sq, 0.12, 0.02)));
      break;
    }
    case 'reserve': {
      const a = add(geo('ringO', () => new THREE.TorusGeometry(0.42, 0.06, 10, 40)), 0, 0.07);
      a.rotation.x = Math.PI / 2;
      const b = add(geo('ringI', () => new THREE.TorusGeometry(0.2, 0.06, 10, 32)), 0, 0.07);
      b.rotation.x = Math.PI / 2;
      break;
    }
    case 'command': {
      add(geo('pole', () => new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8)), -0.22, 0.45);
      const p = new THREE.Shape();
      p.moveTo(0, 0); p.lineTo(0.5, -0.14); p.lineTo(0, -0.3); p.closePath();
      const pen = new THREE.Mesh(geo('pennant', () => new THREE.ExtrudeGeometry(p, { depth: 0.04, bevelEnabled: false })), color);
      pen.position.set(-0.2, 0.88, -0.02);
      pen.castShadow = true;
      g.add(pen);
      break;
    }
    default: {
      add(geo('pip', () => new THREE.SphereGeometry(0.2, 20, 14)), 0, 0.12);
    }
  }
  return { obj: g, spin };
}

/** A force as a 3D game piece in its faction's shape with its unit symbol on top. Radius 1 before scaling. */
export function createForceToken(key: ColorKey, cls: UnitClass): ForceToken {
  const group = new THREE.Group();
  const deep = mat(`deep-${key}`, () => new THREE.MeshStandardMaterial({ color: FACTION_DEEP[key], roughness: 0.55, metalness: 0.25, emissive: FACTION_DEEP[key], emissiveIntensity: 0.25 }));
  const rim = mat(`rim-${key}`, () => new THREE.MeshStandardMaterial({ color: FACTION_COLOR[key], roughness: 0.4, metalness: 0.3, emissive: FACTION_COLOR[key], emissiveIntensity: 0.35 }));
  const sym = mat(`sym-${key}`, () => new THREE.MeshStandardMaterial({ color: FACTION_PALE[key], roughness: 0.3, metalness: 0.2, emissive: FACTION_COLOR[key], emissiveIntensity: 0.7 }));
  const base = new THREE.Mesh(geo(`base-${FACTION_SHAPE[key]}`, () => flat(factionShape(key, 1.08), 0.1, 0.03)), rim);
  const top = new THREE.Mesh(geo(`top-${FACTION_SHAPE[key]}`, () => flat(factionShape(key, 0.94), PLINTH, 0.05)), deep);
  for (const m of [base, top]) { m.castShadow = true; m.receiveShadow = true; }
  top.position.y = 0.06;
  group.add(base, top);
  const g = glyph(cls, sym);
  g.obj.position.y = PLINTH + 0.1;
  group.add(g.obj);
  // Heading chevron, shown while the formation moves.
  const heading = new THREE.Mesh(geo('chevron', () => {
    const c = new THREE.ConeGeometry(0.22, 0.45, 3);
    c.rotateX(Math.PI / 2);
    return c;
  }), rim);
  heading.position.set(0, PLINTH * 0.6, 0);
  heading.visible = false;
  group.add(heading);
  const halo = new THREE.Mesh(geo('halo', () => {
    const r = new THREE.RingGeometry(1.25, 1.45, 48);
    r.rotateX(-Math.PI / 2);
    return r;
  }), mat('halo', () => new THREE.MeshBasicMaterial({ color: 0xd4ab57, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })));
  halo.position.y = 0.03;
  halo.visible = false;
  group.add(halo);
  return { group, spin: g.spin, heading, halo, body: [base, top] };
}

/** Token radius in world units: steps through echelons like the 2D marker, the number carries magnitude. */
export function tokenRadius(strength: number | null): number {
  if (strength === null) return 0.38;
  return strength >= 500_000 ? 0.7 : strength >= 100_000 ? 0.6 : strength >= 20_000 ? 0.52 : strength >= 2_000 ? 0.45 : strength >= 50 ? 0.39 : 0.35;
}

/** Greyed and tipped over: a destroyed formation lingers like its struck-through 2D marker. */
export function setDestroyed(t: ForceToken, on: boolean): void {
  t.group.rotation.z = on ? 0.55 : 0;
  const dead = mat('dead', () => new THREE.MeshStandardMaterial({ color: 0x4a4f53, roughness: 0.9 }));
  for (const m of t.body) {
    if (!m.userData.live) m.userData.live = m.material;
    m.material = on ? dead : (m.userData.live as THREE.Material);
  }
}

/* ------------------------------------------------------------------ */
/* Strategic points                                                    */
/* ------------------------------------------------------------------ */

export function createStrategicModel(kind: NonNullable<Place['symbol']>): { group: THREE.Group; flag: THREE.Object3D | null } {
  const group = new THREE.Group();
  const stone = mat('stone', () => new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.85 }));
  const dark = mat('darkwood', () => new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.8 }));
  const gold = mat('gold', () => new THREE.MeshStandardMaterial({ color: 0xd4ab57, emissive: 0x6a4a10, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
  const alert = mat('alert', () => new THREE.MeshStandardMaterial({ color: 0xe0614f, emissive: 0x6a1a10, emissiveIntensity: 0.6, roughness: 0.5 }));
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  let flag: THREE.Object3D | null = null;
  switch (kind) {
    case 'halt': {
      add(geo('s-pole', () => new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8)), dark, 0, 0.75);
      const cloth = new THREE.Shape();
      cloth.moveTo(0, 0); cloth.lineTo(0.7, -0.2); cloth.lineTo(0, -0.42); cloth.closePath();
      const c = add(geo('s-cloth', () => new THREE.ShapeGeometry(cloth)), gold, 0.02, 1.48);
      flag = c;
      add(geo('s-foot', () => new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16)), stone, 0, 0.04);
      break;
    }
    case 'gate': {
      const tower = geo('s-tower', () => new THREE.BoxGeometry(0.32, 0.9, 0.32));
      add(tower, stone, -0.36, 0.45);
      add(tower, stone, 0.36, 0.45);
      const cap = geo('s-cap', () => new THREE.ConeGeometry(0.26, 0.3, 4));
      add(cap, dark, -0.36, 1.05).rotation.y = Math.PI / 4;
      add(cap, dark, 0.36, 1.05).rotation.y = Math.PI / 4;
      const arch = add(geo('s-arch', () => new THREE.TorusGeometry(0.22, 0.07, 8, 20, Math.PI)), stone, 0, 0.62);
      arch.rotation.set(0, 0, 0);
      add(geo('s-lintel', () => new THREE.BoxGeometry(0.44, 0.12, 0.2)), stone, 0, 0.86);
      break;
    }
    case 'crossing': {
      const ch = new THREE.Shape();
      ch.moveTo(-0.5, -0.2); ch.lineTo(0, 0.3); ch.lineTo(0.5, -0.2); ch.lineTo(0.5, -0.4); ch.lineTo(0, 0.1); ch.lineTo(-0.5, -0.4); ch.closePath();
      add(geo('s-chevron', () => flat(ch, 0.18, 0.02)), gold);
      break;
    }
    case 'objective': {
      const o = add(geo('s-ringO', () => new THREE.TorusGeometry(0.5, 0.06, 10, 40)), alert, 0, 0.08);
      o.rotation.x = Math.PI / 2;
      const i = add(geo('s-ringI', () => new THREE.TorusGeometry(0.24, 0.06, 10, 32)), alert, 0, 0.08);
      i.rotation.x = Math.PI / 2;
      add(geo('s-pin', () => new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8)), alert, 0, 0.45);
      break;
    }
    case 'staging':
      add(geo('s-block', () => new THREE.BoxGeometry(0.6, 0.3, 0.6)), stone, 0, 0.15);
      add(geo('s-dot', () => new THREE.SphereGeometry(0.1, 12, 8)), gold, 0, 0.36);
      break;
    case 'camp': {
      const tent = add(geo('s-tent', () => new THREE.ConeGeometry(0.42, 0.6, 4)), mat('canvas', () => new THREE.MeshStandardMaterial({ color: 0xb7a27a, roughness: 0.9 })), 0, 0.3);
      tent.rotation.y = Math.PI / 4;
      break;
    }
  }
  return { group, flag };
}

/* ------------------------------------------------------------------ */
/* 2.5D character standees                                             */
/* ------------------------------------------------------------------ */

const CARD_W = 0.92;
const CARD_H = (CARD_W * 17) / 11;
const cardCache = new Map<string, Promise<THREE.CanvasTexture>>();

/** The photocard composed into a framed card: faction border, picture, name strip. */
function cardTexture(src: string, name: string, color: string): Promise<THREE.CanvasTexture> {
  const key = `${src}|${color}`;
  let p = cardCache.get(key);
  if (p) return p;
  p = new Promise<THREE.CanvasTexture>((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const W = 264;
      const H = 408;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d')!;
      const r = 18;
      const rr = (x: number, y: number, w: number, h: number, rad: number) => {
        g.beginPath();
        g.moveTo(x + rad, y);
        g.arcTo(x + w, y, x + w, y + h, rad);
        g.arcTo(x + w, y + h, x, y + h, rad);
        g.arcTo(x, y + h, x, y, rad);
        g.arcTo(x, y, x + w, y, rad);
        g.closePath();
      };
      rr(0, 0, W, H, r);
      g.fillStyle = color;
      g.fill();
      g.save();
      rr(8, 8, W - 16, H - 16, r - 6);
      g.clip();
      g.fillStyle = '#10161a';
      g.fillRect(0, 0, W, H);
      // Cover-fit the photocard.
      const s = Math.max((W - 16) / im.width, (H - 16) / im.height);
      g.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s);
      const grd = g.createLinearGradient(0, H - 96, 0, H);
      grd.addColorStop(0, 'rgba(8,10,12,0)');
      grd.addColorStop(1, 'rgba(8,10,12,0.92)');
      g.fillStyle = grd;
      g.fillRect(0, H - 96, W, 96);
      g.restore();
      g.font = '700 26px "IBM Plex Sans Condensed", system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#fff6dc';
      let label = name;
      while (g.measureText(label).width > W - 36 && label.length > 4) label = `${label.slice(0, -2)}…`;
      g.fillText(label, W / 2, H - 26);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      resolve(tex);
    };
    im.onerror = reject;
    im.src = src;
  });
  cardCache.set(key, p);
  return p;
}

export interface Standee {
  group: THREE.Group;
  card: THREE.Mesh;
  born: number;
}

/** A character as a paper-theatre standee: an upright photocard on a round stand in the faction colour. */
export function createStandee(src: string, name: string, key: ColorKey): Standee {
  const group = new THREE.Group();
  const stand = new THREE.Mesh(geo('stand', () => new THREE.CylinderGeometry(0.3, 0.36, 0.08, 28)), mat(`rim-${key}`, () => new THREE.MeshStandardMaterial({ color: FACTION_COLOR[key], roughness: 0.4, metalness: 0.3, emissive: FACTION_COLOR[key], emissiveIntensity: 0.35 })));
  stand.position.y = 0.04;
  stand.castShadow = true;
  stand.receiveShadow = true;
  const post = new THREE.Mesh(geo('post', () => new THREE.BoxGeometry(0.08, 0.16, 0.04)), mat('darkwood', () => new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.8 })));
  post.position.y = 0.14;
  // Not tone-mapped and just below white, so the bloom pass does not wash the picture out.
  const material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, color: 0xd2d2d2, toneMapped: false });
  const card = new THREE.Mesh(geo('card', () => {
    const p = new THREE.PlaneGeometry(CARD_W, CARD_H);
    p.translate(0, CARD_H / 2 + 0.2, 0);
    return p;
  }), material);
  card.castShadow = true;
  card.renderOrder = 5;
  group.add(stand, post, card);
  void cardTexture(src, name, FACTION_COLOR[key]).then((tex) => {
    material.map = tex;
    material.needsUpdate = true;
    card.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  }, () => undefined);
  return { group, card, born: performance.now() };
}
