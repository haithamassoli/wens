"use client";

import { type PointerEvent, useState } from "react";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { segmentHitsCircle } from "@/lib/engine/arcade";
import type { GameMeta } from "@/lib/games";
import { useSettings } from "@/lib/storage";
import { Stats } from "./Setup";
import {
  burst,
  buzz,
  drawParticles,
  glow,
  heartPath,
  type Particle,
  PENTATONIC,
  Stage,
  toCanvas,
  tone,
  useCanvasLoop,
} from "./shared/arcade";

const W = 360;
const H = 600;
const ORB = 18;
const REACH = 70; // a finger must land this close to an orb to pick it up
const SLACK = 170; // shorter than this, the thread sags
const STRAIN = 250; // longer than this, it glows red
const SNAP = 300; // and here it breaks
const LIVES = 3;
const COLORS = ["#F0A23B", "#3CC4B0"] as const;

type Kind = "star" | "thorn" | "heart";
interface Item {
  kind: Kind;
  x: number;
  y: number;
  vy: number;
  r: number;
  spin: number;
  sway: number;
}
interface Orb {
  x: number;
  y: number;
  held: number | null;
}
interface World {
  status: "waiting" | "playing" | "paused" | "over";
  orbs: [Orb, Orb];
  items: Item[];
  particles: Particle[];
  dust: { x: number; y: number; r: number }[];
  time: number;
  nextSpawn: number;
  lives: number;
  stars: number;
  combo: number;
  best: number;
  lastStar: number;
  hurt: number; // seconds of invulnerability left after a hit or snap
  snapped: boolean;
}

const freshWorld = (): World => ({
  status: "waiting",
  orbs: [
    { x: W * 0.3, y: H * 0.78, held: null },
    { x: W * 0.7, y: H * 0.78, held: null },
  ],
  items: [],
  particles: [],
  dust: Array.from({ length: 50 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.3 + 0.3,
  })),
  time: 0,
  nextSpawn: 1,
  lives: LIVES,
  stars: 0,
  combo: 0,
  best: 0,
  lastStar: -9,
  hurt: 0,
  snapped: false,
});

/** Midpoint of the drawn (sagging) thread; collisions use A→mid→B so they match the picture. */
function threadMid(a: Orb, b: Orb, t: number, strained: boolean) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = Math.max(0, SLACK - d) * 0.45;
  const jitter = strained ? Math.sin(t * 60) * 3 : 0;
  // Control point of the quadratic, and the curve's actual midpoint (half-way to it).
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 + sag * 2 + jitter;
  return { cx, cy, mx: cx, my: (a.y + b.y) / 4 + cy / 2 };
}

/** Spawn one pattern. Early on mostly stars; thorns and "gates" grow with time. */
function spawn(w: World) {
  const speed = Math.min(80 + w.time * 1.6, 230);
  const add = (kind: Kind, x: number, dy = 0) =>
    w.items.push({
      kind,
      x,
      y: -20 - dy,
      vy: speed * (kind === "heart" ? 0.8 : 1),
      r: kind === "thorn" ? 13 : 11,
      spin: Math.random() * 6,
      sway: Math.random() * 6,
    });
  const x = 40 + Math.random() * (W - 80);
  const roll = Math.random();
  const danger = Math.min(0.15 + w.time / 180, 0.4);
  if (w.lives < LIVES && roll < 0.04) add("heart", x);
  else if (roll < 0.04 + danger * 0.6) add("thorn", x);
  else if (roll < 0.04 + danger && w.time > 12) {
    // A gate: two thorns with a star between. Come close together to slip through.
    const gap = Math.max(130 - w.time, 90);
    const cx = gap / 2 + 20 + Math.random() * (W - gap - 40);
    add("thorn", cx - gap / 2);
    add("thorn", cx + gap / 2);
    add("star", cx);
  } else if (roll < 0.72) add("star", x);
  else {
    // A row of stars: hold the thread level to sweep them all.
    const n = 5;
    const x0 = 30 + Math.random() * (W - 60 - (n - 1) * 34);
    for (let i = 0; i < n; i++) add("star", x0 + i * 34, Math.abs(i - 2) * 8);
  }
  w.nextSpawn = Math.max(0.5, 1.25 - w.time * 0.006) * (0.8 + Math.random() * 0.4);
}

/** G38 — Our Thread: two fingers, one glowing thread; collect stars together, dodge thorns. */
export function G38Play({ game }: { game: GameMeta }) {
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ stars: number; best: number; early: boolean } | null>(
    null,
  );
  const [world, setWorld] = useState(freshWorld);

  if (result)
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={
            result.stars === 0 ? "الخيط ينتظركما في جولة أخرى" : `جمعتما ${result.stars} نجمة معاً`
          }
          note={result.early ? "انتهت الجولة مبكراً." : undefined}
          onReplay={() => {
            setWorld(freshWorld());
            setResult(null);
            setRun((r) => r + 1);
          }}
        >
          <Stats
            rows={[
              { label: "نجوم", value: <Num value={result.stars} /> },
              { label: "أطول سلسلة متتالية", value: <Num value={result.best} /> },
            ]}
          />
        </ResultShell>
      </SessionFrame>
    );

  return (
    <SessionFrame
      game={game}
      live
      onExit={() => setResult({ stars: world.stars, best: world.best, early: true })}
    >
      <Field
        key={run}
        world={world}
        onOver={(stars, best) => setResult({ stars, best, early: false })}
      />
    </SessionFrame>
  );
}

function Field({
  world: w,
  onOver,
}: {
  world: World;
  onOver: (stars: number, best: number) => void;
}) {
  const { settings } = useSettings();
  // HUD mirrors: set from the loop only when a value changes (React bails on equal values).
  const [status, setStatus] = useState(w.status);
  const [lives, setLives] = useState(w.lives);
  const [stars, setStars] = useState(w.stars);

  const lose = (x: number, y: number) => {
    w.lives--;
    w.hurt = 1.4;
    w.combo = 0;
    burst(w.particles, x, y, "#B46BFF", 26, 220);
    buzz(90);
    if (settings.sound) tone(147, 260, "sawtooth", 0.06);
    if (w.lives <= 0) {
      w.status = "over";
      setTimeout(() => onOver(w.stars, w.best), 1100);
    }
  };

  const canvasRef = useCanvasLoop(W, H, (ctx, dt, t) => {
    const [a, b] = w.orbs;
    const d = Math.hypot(b.x - a.x, b.y - a.y);

    if (w.status === "playing") {
      w.time += dt;
      w.hurt = Math.max(0, w.hurt - dt);
      if (t - w.lastStar > 1.6) w.combo = 0;
      w.nextSpawn -= dt;
      if (w.nextSpawn <= 0) spawn(w);

      if (!w.snapped && d > SNAP && w.hurt === 0) {
        w.snapped = true;
        lose((a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (w.snapped && d < STRAIN && w.hurt === 0) w.snapped = false;

      const { mx, my } = threadMid(a, b, t, d > STRAIN);
      for (let i = w.items.length - 1; i >= 0; i--) {
        const it = w.items[i];
        it.y += it.vy * dt;
        it.spin += dt * (it.kind === "thorn" ? 1.5 : 2.5);
        const sx = it.x + Math.sin(it.y / 60 + it.sway) * 8;
        const hit =
          !w.snapped &&
          (segmentHitsCircle(a.x, a.y, mx, my, sx, it.y, it.r + 2) ||
            segmentHitsCircle(mx, my, b.x, b.y, sx, it.y, it.r + 2));
        if (hit && it.kind === "thorn" && w.hurt > 0) continue; // pass through while blinking
        if (hit) {
          w.items.splice(i, 1);
          if (it.kind === "thorn") lose(sx, it.y);
          else if (it.kind === "heart") {
            w.lives = Math.min(LIVES, w.lives + 1);
            burst(w.particles, sx, it.y, "#FF6B8B", 22);
            if (settings.sound) tone(PENTATONIC[7], 300, "triangle", 0.1);
          } else {
            w.stars++;
            w.combo++;
            w.best = Math.max(w.best, w.combo);
            w.lastStar = t;
            burst(w.particles, sx, it.y, "#FFD27A", 14);
            if (settings.sound) tone(PENTATONIC[(w.combo - 1) % PENTATONIC.length], 180);
          }
        } else if (it.y > H + 30) w.items.splice(i, 1);
      }
    }

    setStatus(w.status);
    setLives(w.lives);
    setStars(w.stars);
    draw(ctx, w, d, dt, t);
  });

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (w.status === "over") return;
    const p = toCanvas(e, W, H, e.currentTarget);
    const free = w.orbs.filter((o) => o.held === null);
    const orb = free.sort(
      (m, n) => Math.hypot(m.x - p.x, m.y - p.y) - Math.hypot(n.x - p.x, n.y - p.y),
    )[0];
    if (!orb || Math.hypot(orb.x - p.x, orb.y - p.y) > REACH) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    orb.held = e.pointerId;
    Object.assign(orb, clampToField(p));
    if (w.orbs.every((o) => o.held !== null)) w.status = "playing";
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const orb = w.orbs.find((o) => o.held === e.pointerId);
    if (orb) Object.assign(orb, clampToField(toCanvas(e, W, H, e.currentTarget)));
  };
  const up = (e: PointerEvent<HTMLCanvasElement>) => {
    const orb = w.orbs.find((o) => o.held === e.pointerId);
    if (!orb) return;
    orb.held = null;
    if (w.status === "playing") w.status = "paused";
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between px-1" aria-live="polite">
        <span className="font-bold font-display text-2xl">
          <span aria-hidden="true" className="text-marigold">
            ✦{" "}
          </span>
          <Num value={stars} />
          <span className="sr-only"> نجمة</span>
        </span>
        <span className="flex gap-1" role="img" aria-label={`المحاولات المتبقية: ${lives}`}>
          {Array.from({ length: LIVES }, (_, i) => i + 1).map((n) => (
            <svg key={n} width="22" height="22" viewBox="-12 -12 24 24" aria-hidden="true">
              <path
                d="M0 9.9C-14.9 0-8.3-12.7 0-5 8.3-12.7 14.9 0 0 9.9Z"
                fill={n <= lives ? "#D9647A" : "none"}
                stroke="#D9647A"
                strokeWidth="1.6"
              />
            </svg>
          ))}
        </span>
      </div>
      <Stage
        canvasRef={canvasRef}
        W={W}
        H={H}
        reserve="10rem"
        label="خيط يصل بين إصبعيكما، ونجوم تتساقط"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {status === "waiting" || status === "paused" ? (
          <div
            dir="rtl"
            role="status"
            className="pointer-events-none absolute inset-x-6 top-[22%] flex flex-col gap-2 text-center text-ground"
          >
            <p className="font-bold font-display text-2xl">
              {status === "waiting" ? "ضعا إصبعين على الدائرتين" : "توقّف الخيط"}
            </p>
            <p className="text-ground/75">
              {status === "waiting"
                ? "إصبع لكلٍّ منكما. اجمعا النجوم بالخيط وتجنّبا الأشواك، ولا تبتعدا كثيراً فينقطع."
                : "أعيدا إصبعيكما إلى الدائرتين لنكمل."}
            </p>
          </div>
        ) : null}
      </Stage>
    </div>
  );
}

const clampToField = (p: { x: number; y: number }) => ({
  x: Math.min(W - ORB, Math.max(ORB, p.x)),
  y: Math.min(H - ORB, Math.max(ORB, p.y)),
});

function star(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function thorn(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const rr = i % 2 ? r * 0.55 : r * 1.25;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function draw(ctx: CanvasRenderingContext2D, w: World, d: number, dt: number, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#120a24");
  bg.addColorStop(0.6, "#2a1a3f");
  bg.addColorStop(1, "#3d2150");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Distant dust drifts slowly, faster once the game runs.
  ctx.fillStyle = "#f3eef7";
  for (const s of w.dust) {
    if (w.status === "playing") s.y = (s.y + dt * (8 + s.r * 14)) % H;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + s.x);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const it of w.items) {
    const sx = it.x + Math.sin(it.y / 60 + it.sway) * 8;
    ctx.save();
    ctx.translate(sx, it.y);
    ctx.rotate(it.kind === "heart" ? Math.sin(it.spin) * 0.3 : it.spin);
    if (it.kind === "star") {
      glow(ctx, "#FFD27A", 16);
      ctx.fillStyle = "#FFE3A3";
      star(ctx, it.r);
    } else if (it.kind === "thorn") {
      glow(ctx, "#B46BFF", 12);
      ctx.fillStyle = "#4B2A6B";
      thorn(ctx, it.r);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#1A0F26";
      ctx.beginPath();
      ctx.arc(0, 0, it.r * 0.4, 0, Math.PI * 2);
    } else {
      glow(ctx, "#FF6B8B", 18);
      ctx.fillStyle = "#FF6B8B";
      heartPath(ctx, it.r);
    }
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  const [a, b] = w.orbs;
  const strained = d > STRAIN;
  const blink = w.hurt > 0 && Math.floor(t * 10) % 2 === 0;
  if (!w.snapped && !blink) {
    const { cx, cy } = threadMid(a, b, t, strained);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, strained ? "#FF5A5A" : COLORS[0]);
    grad.addColorStop(0.5, strained ? "#FF8A8A" : "#FFF1D6");
    grad.addColorStop(1, strained ? "#FF5A5A" : COLORS[1]);
    glow(ctx, strained ? "#FF5A5A" : "#FFE3A3", 14);
    ctx.strokeStyle = grad;
    ctx.lineWidth = strained ? 2.5 : 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (w.snapped) {
    // Two frayed ends hang from the orbs until they come back together.
    for (const [o, c] of [
      [a, COLORS[0]],
      [b, COLORS[1]],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.quadraticCurveTo(o.x + 8, o.y + 20, o.x + Math.sin(t * 3) * 6, o.y + 36);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  w.orbs.forEach((o, i) => {
    if (o.held === null && w.status !== "over") {
      const k = (t * 0.9) % 1;
      ctx.strokeStyle = COLORS[i];
      ctx.globalAlpha = 0.7 - k * 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, ORB + 6 + k * 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const g = ctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, ORB);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(0.35, COLORS[i]);
    g.addColorStop(1, `${COLORS[i]}00`);
    glow(ctx, COLORS[i], o.held !== null ? 30 : 14);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, ORB + (o.held !== null ? 3 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  drawParticles(ctx, w.particles, dt);
}
