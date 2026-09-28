"use client";

import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
} from "react";

/**
 * Crisp W×H canvas (devicePixelRatio-aware) that calls `frame` every animation frame while
 * the canvas is mounted. Returned as a callback ref, so the loop restarts when the canvas
 * remounts (SessionFrame swaps it for the privacy curtain while the tab is hidden). `dt` is
 * in seconds and clamped, so a throttled tab never teleports bodies.
 */
export function useCanvasLoop(
  W: number,
  H: number,
  frame: (ctx: CanvasRenderingContext2D, dt: number, t: number) => void,
) {
  const frameRef = useRef(frame);
  useEffect(() => {
    frameRef.current = frame;
  });
  return useCallback(
    (canvas: HTMLCanvasElement | null) => {
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let last = performance.now();
      let id = requestAnimationFrame(function loop(now) {
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        frameRef.current(ctx, dt, now / 1000);
        id = requestAnimationFrame(loop);
      });
      return () => cancelAnimationFrame(id);
    },
    [W, H],
  );
}

/** Pointer position in canvas units. */
export function toCanvas(
  e: { clientX: number; clientY: number },
  W: number,
  H: number,
  el: Element,
) {
  const r = el.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

type CanvasHandlers = Pick<
  ComponentProps<"canvas">,
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
>;

/**
 * The play surface: a W:H canvas as large as fits (`reserve` = vertical space kept for the
 * chrome around it), multi-touch friendly, with DOM overlays on top. LTR so coordinates
 * never flip under the RTL page; overlays set their own `dir`.
 */
export function Stage({
  canvasRef,
  W,
  H,
  label,
  reserve = "7.5rem",
  children,
  ...handlers
}: {
  canvasRef: Ref<HTMLCanvasElement>;
  W: number;
  H: number;
  label: string;
  reserve?: string;
  children?: ReactNode;
} & CanvasHandlers) {
  return (
    <div
      dir="ltr"
      className="relative mx-auto select-none"
      style={{
        width: `min(100%, calc((100dvh - ${reserve}) * ${W / H}))`,
        aspectRatio: `${W} / ${H}`,
        WebkitTouchCallout: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="absolute inset-0 size-full touch-none rounded-card shadow-lift"
        onContextMenu={(e) => e.preventDefault()}
        {...handlers}
      />
      {children}
    </div>
  );
}

let audio: AudioContext | null = null;
/** Soft blip. Callers check `settings.sound` first (NFR-UX-04: sound is opt-in). */
export function tone(freq: number, ms = 140, type: OscillatorType = "sine", vol = 0.12, delay = 0) {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
  } catch {
    /* no audio available: stay silent */
  }
}

/** Short haptic tick where supported (Android); a no-op elsewhere. */
export const buzz = (ms: number) => void navigator.vibrate?.(ms);

/** C-major pentatonic, so any run of pickups sounds like a tune. */
export const PENTATONIC = [523, 587, 659, 784, 880, 1047, 1175, 1319];

/** Heart outline centred on the origin, about 2s wide. Caller fills/strokes. */
export function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.35, 0, -s * 0.75, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.75, -s * 1.15, s * 1.35, 0, 0, s * 0.9);
  ctx.closePath();
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds left
  color: string;
  size: number;
}

export function burst(into: Particle[], x: number, y: number, color: string, n = 16, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    into.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.5,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

/** Advance and draw particles; dead ones are dropped in place. */
export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[], dt: number) {
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) {
      ps.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Soft glow for the next fill/stroke; pair with `ctx.shadowBlur = 0` afterwards. */
export function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
