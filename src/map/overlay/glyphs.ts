import type { BattleType } from '@/types/dataset';

export type Shape = 'square' | 'circle' | 'diamond' | 'triangle' | 'hex';

/** Traces a faction marker shape centred on (x, y) with "radius" r. */
export function tracePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number): void {
  ctx.beginPath();
  switch (shape) {
    case 'square':
      ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
      break;
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r * 1.15, y);
      ctx.lineTo(x, y + r * 1.15);
      ctx.lineTo(x - r * 1.15, y);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r * 1.05, y + r * 0.75);
      ctx.lineTo(x - r * 1.05, y + r * 0.75);
      ctx.closePath();
      break;
    case 'hex':
      for (let i = 0; i < 6; i += 1) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
  }
}

/**
 * Battle iconography. Each type has a distinct silhouette so the type reads
 * without colour: crossed blades for battle, a ring of crenels for siege, a
 * chevron for interception, a shield for defence, a burst for special combat,
 * a pennant for political events.
 */
export function drawBattleIcon(ctx: CanvasRenderingContext2D, type: BattleType, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const h = s / 2;
  switch (type) {
    case 'MAJOR_BATTLE':
    case 'ENGAGEMENT': {
      ctx.beginPath();
      ctx.moveTo(x - h, y - h);
      ctx.lineTo(x + h, y + h);
      ctx.moveTo(x + h, y - h);
      ctx.lineTo(x - h, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - h * 0.95, y + h * 0.35);
      ctx.lineTo(x - h * 0.35, y + h * 0.95);
      ctx.moveTo(x + h * 0.95, y + h * 0.35);
      ctx.lineTo(x + h * 0.35, y + h * 0.95);
      ctx.stroke();
      break;
    }
    case 'SIEGE': {
      ctx.beginPath();
      ctx.arc(x, y, h * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * h * 0.8, y + Math.sin(a) * h * 0.8);
        ctx.lineTo(x + Math.cos(a) * h * 1.15, y + Math.sin(a) * h * 1.15);
        ctx.stroke();
      }
      break;
    }
    case 'INTERCEPTION':
    case 'AMBUSH': {
      ctx.beginPath();
      ctx.moveTo(x - h, y - h * 0.6);
      ctx.lineTo(x, y + h * 0.5);
      ctx.lineTo(x + h, y - h * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + h * 0.5, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'DEFENSIVE_ACTION':
    case 'RETREAT': {
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + h * 0.85, y - h * 0.55);
      ctx.lineTo(x + h * 0.7, y + h * 0.35);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x - h * 0.7, y + h * 0.35);
      ctx.lineTo(x - h * 0.85, y - h * 0.55);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'SPECIAL_COMBAT': {
      ctx.beginPath();
      for (let i = 0; i < 16; i += 1) {
        const a = (i * Math.PI) / 8;
        const rr = i % 2 === 0 ? h * 1.1 : h * 0.45;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'POLITICAL_EVENT': {
      ctx.beginPath();
      ctx.moveTo(x - h * 0.6, y + h);
      ctx.lineTo(x - h * 0.6, y - h);
      ctx.lineTo(x + h * 0.9, y - h * 0.5);
      ctx.lineTo(x - h * 0.6, y);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export function drawArrowHead(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, size: number, color: string): void {
  const angle = Math.atan2(by - ay, bx - ax);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.55);
  ctx.lineTo(-size * 0.72, 0);
  ctx.lineTo(-size, size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
