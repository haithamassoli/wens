// Pure 2D helpers for the canvas games (G37 hockey, G38 thread, G39 sky). DOM-free so
// `node --test` covers the collision maths; the play screens own drawing and input.

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/** True when segment AB passes within `r` of point C (endpoints included). */
export function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
  const px = ax + t * dx - cx;
  const py = ay + t * dy - cy;
  return px * px + py * py <= r * r;
}

/**
 * Puck against a mallet of infinite mass: push the puck out of overlap and reflect the
 * approaching part of their relative velocity. Mutates `puck`; returns whether they touched.
 */
export function bounceOff(puck: Body, mallet: Body, restitution = 0.9): boolean {
  const dx = puck.x - mallet.x;
  const dy = puck.y - mallet.y;
  const min = puck.r + mallet.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return false;
  const d = Math.sqrt(d2);
  const nx = d === 0 ? 0 : dx / d;
  const ny = d === 0 ? -1 : dy / d;
  puck.x = mallet.x + nx * min;
  puck.y = mallet.y + ny * min;
  const vn = (puck.vx - mallet.vx) * nx + (puck.vy - mallet.vy) * ny;
  if (vn < 0) {
    puck.vx -= (1 + restitution) * vn * nx;
    puck.vy -= (1 + restitution) * vn * ny;
  }
  return true;
}

export function clampSpeed(b: Body, max: number) {
  const s = Math.hypot(b.vx, b.vy);
  if (s > max) {
    b.vx *= max / s;
    b.vy *= max / s;
  }
}

export type Wall = "side" | "end" | null;

/**
 * One physics substep for the hockey puck in a W×H rink whose short walls have a goal mouth
 * of half-width `mouth`, centred. A defends the bottom, B the top, so a puck whose centre
 * crosses the top line inside the mouth is A's goal. Returns the scorer, else which wall it hit.
 */
export function stepPuck(
  p: Body,
  dt: number,
  W: number,
  H: number,
  mouth: number,
  friction = 0.6, // fraction of speed kept per second
): { goal: "A" | "B" | null; wall: Wall } {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const keep = friction ** dt;
  p.vx *= keep;
  p.vy *= keep;
  let wall: Wall = null;
  if (p.x < p.r || p.x > W - p.r) {
    p.x = p.x < p.r ? p.r : W - p.r;
    p.vx = -p.vx * 0.85;
    wall = "side";
  }
  const inMouth = Math.abs(p.x - W / 2) < mouth;
  if (p.y < p.r) {
    if (inMouth) {
      if (p.y < 0) return { goal: "A", wall };
    } else {
      p.y = p.r;
      p.vy = Math.abs(p.vy) * 0.85;
      wall = "end";
    }
  } else if (p.y > H - p.r) {
    if (inMouth) {
      if (p.y > H) return { goal: "B", wall };
    } else {
      p.y = H - p.r;
      p.vy = -Math.abs(p.vy) * 0.85;
      wall = "end";
    }
  }
  return { goal: null, wall };
}

/** Small deterministic PRNG (mulberry32) so G39's sky is the same every visit. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SkyStar {
  x: number;
  y: number;
  r: number; // drawn radius
  phase: number; // twinkle offset
}

/** `count` stars inside W×H with a `pad` margin, kept `gap` apart so taps land on one star. */
export function starField(seed: number, count: number, W: number, H: number, pad = 16, gap = 22) {
  const rnd = mulberry32(seed);
  const stars: SkyStar[] = [];
  for (let tries = 0; stars.length < count && tries < count * 40; tries++) {
    const x = pad + rnd() * (W - 2 * pad);
    const y = pad + rnd() * (H - 2 * pad);
    if (stars.some((s) => (s.x - x) ** 2 + (s.y - y) ** 2 < gap * gap)) continue;
    stars.push({ x, y, r: 0.7 + rnd() ** 3 * 2.3, phase: rnd() * Math.PI * 2 });
  }
  return stars;
}

/** Index of the star nearest (x, y) within `reach`, else -1. */
export function nearestStar(stars: readonly SkyStar[], x: number, y: number, reach: number) {
  let best = -1;
  let bestD = reach * reach;
  stars.forEach((s, i) => {
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
