"use client";

import { type PointerEvent, useState } from "react";
import { Button } from "@/components/Button";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G01_CARDS } from "@/lib/content";
import { type Body, bounceOff, clampSpeed, stepPuck } from "@/lib/engine/arcade";
import { type Aliases, other, type Player, withDefaultAliases } from "@/lib/engine/types";
import { shuffle } from "@/lib/engine/util";
import type { GameMeta } from "@/lib/games";
import { useSettings } from "@/lib/storage";
import { SetupShell, Stats } from "./Setup";
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
const MOUTH = 62; // goal half-width
const MALLET = 28;
const PUCK = 16;
const WIN = 5;
const MAX_SPEED = 1300;
const PLAYERS = ["A", "B"] as const;
// A sits at the bottom edge, B at the top (the phone lies flat between them).
const COLOR: Record<Player, string> = { A: "#F0A23B", B: "#3CC4B0" };
/** Light conversation cards reused as the "you conceded, answer this" prompt. */
const QUESTIONS = G01_CARDS.filter((c) => c.status === "published" && c.depth === "light");

type Mallet = Body & { tx: number; ty: number; held: number | null; touched: boolean };
interface World {
  puck: Body;
  mallets: Record<Player, Mallet>;
  score: Record<Player, number>;
  trail: { x: number; y: number }[];
  particles: Particle[];
  frozen: boolean;
  flash: { who: Player; t: number } | null;
  spin: number;
  lastHit: number;
}

const mallet = (y: number): Mallet => ({
  x: W / 2,
  y,
  vx: 0,
  vy: 0,
  r: MALLET,
  tx: W / 2,
  ty: y,
  held: null,
  touched: false,
});
const freshWorld = (): World => ({
  puck: { x: W / 2, y: H / 2, vx: 0, vy: 0, r: PUCK },
  mallets: { A: mallet(H - 80), B: mallet(80) },
  score: { A: 0, B: 0 },
  trail: [],
  particles: [],
  frozen: false,
  flash: null,
  spin: 0,
  lastHit: 0,
});

/** G37 — Heart Hockey: air hockey on a phone lying flat; conceding a goal earns a question. */
export function G37Play({ game }: { game: GameMeta }) {
  const [aliases, setAliases] = useState<Aliases | null>(null);
  const [match, setMatch] = useState(0);

  if (aliases)
    return (
      <Match key={match} game={game} aliases={aliases} onReplay={() => setMatch((m) => m + 1)} />
    );

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={QUESTIONS.length}
        requested={WIN * 2}
        onStart={(a) => setAliases(withDefaultAliases(a))}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          ضعا الهاتف مسطّحاً على الطاولة، وليجلس كلٌّ منكما عند طرف. الأول في الأسفل والثاني في الأعلى.
          من يستقبل هدفاً يجيب عن سؤال خفيف، والفوز لمن يسجّل <Num value={WIN} /> أهداف أولاً.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Match({
  game,
  aliases,
  onReplay,
}: {
  game: GameMeta;
  aliases: Aliases;
  onReplay: () => void;
}) {
  const { settings } = useSettings();
  const [world] = useState(freshWorld);
  const [score, setScore] = useState(world.score);
  const [asking, setAsking] = useState<Player | null>(null);
  const [deck] = useState(() => shuffle(QUESTIONS));
  const [qi, setQi] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [ended, setEnded] = useState(false);

  const onGoal = (scorer: Player) => {
    const conceder = other(scorer);
    world.frozen = true;
    world.trail = [];
    world.score[scorer]++;
    setScore({ ...world.score });
    world.flash = { who: conceder, t: 0.9 };
    burst(world.particles, world.puck.x, scorer === "A" ? 4 : H - 4, COLOR[scorer], 44, 280);
    if (settings.sound)
      for (const [i, f] of [PENTATONIC[2], PENTATONIC[4], PENTATONIC[5]].entries())
        tone(f, 260, "triangle", 0.12, i * 0.1);
    buzz(120);
    setTimeout(() => (world.score[scorer] >= WIN ? setEnded(true) : setAsking(conceder)), 900);
  };

  const serve = (to: Player) => {
    Object.assign(world.puck, { x: W / 2, y: to === "A" ? H / 2 + 80 : H / 2 - 80, vx: 0, vy: 0 });
    world.trail = [];
    world.frozen = false;
    setAsking(null);
  };

  const canvasRef = useCanvasLoop(W, H, (ctx, dt, t) => {
    const { puck, mallets } = world;
    for (const p of PLAYERS) {
      const m = mallets[p];
      m.vx = (m.tx - m.x) / dt;
      m.vy = (m.ty - m.y) / dt;
      clampSpeed(m, 2400);
      m.x = m.tx;
      m.y = m.ty;
    }
    // 4 substeps keep a fast puck from tunnelling through a mallet.
    if (!world.frozen) {
      for (let i = 0; i < 4 && !world.frozen; i++) {
        const { goal, wall } = stepPuck(puck, dt / 4, W, H, MOUTH);
        if (goal) onGoal(goal);
        else if (wall && settings.sound && Math.hypot(puck.vx, puck.vy) > 150)
          tone(196, 70, "sine", 0.05);
        for (const p of PLAYERS) {
          if (!bounceOff(puck, mallets[p])) continue;
          clampSpeed(puck, MAX_SPEED);
          if (t - world.lastHit > 0.1) {
            world.lastHit = t;
            if (settings.sound)
              tone(330 + Math.min(Math.hypot(puck.vx, puck.vy), 1200) / 3, 90, "triangle", 0.1);
            buzz(15);
          }
        }
      }
      world.spin += (puck.vx * dt) / 40;
      world.trail.push({ x: puck.x, y: puck.y });
      if (world.trail.length > 14) world.trail.shift();
    }
    draw(ctx, world, dt, t);
  });

  // Each finger drives the mallet of the half it first touched; the other half stays free.
  const side = (y: number): Player => (y > H / 2 ? "A" : "B");
  const moveTo = (m: Mallet, p: Player, x: number, y: number) => {
    m.tx = Math.min(W - MALLET, Math.max(MALLET, x));
    m.ty =
      p === "A"
        ? Math.min(H - MALLET, Math.max(H / 2 + MALLET, y))
        : Math.min(H / 2 - MALLET, Math.max(MALLET, y));
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvas(e, W, H, e.currentTarget);
    const p = side(y);
    const m = world.mallets[p];
    if (m.held !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    m.held = e.pointerId;
    m.touched = true;
    moveTo(m, p, x, y);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    for (const p of PLAYERS) {
      const m = world.mallets[p];
      if (m.held !== e.pointerId) continue;
      const { x, y } = toCanvas(e, W, H, e.currentTarget);
      moveTo(m, p, x, y);
    }
  };
  const up = (e: PointerEvent<HTMLCanvasElement>) => {
    for (const p of PLAYERS)
      if (world.mallets[p].held === e.pointerId) world.mallets[p].held = null;
  };

  if (ended) {
    const lead = score.A === score.B ? null : score.A > score.B ? "A" : "B";
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={lead ? `الفوز من نصيب ${aliases[lead]}` : "تعادل جميل"}
          note={Math.max(score.A, score.B) < WIN ? "انتهت المباراة مبكراً." : undefined}
          onReplay={onReplay}
        >
          <Stats
            rows={[
              { label: `أهداف ${aliases.A}`, value: <Num value={score.A} /> },
              { label: `أهداف ${aliases.B}`, value: <Num value={score.B} /> },
              { label: "أسئلة أُجيب عنها", value: <Num value={answered} /> },
            ]}
          />
        </ResultShell>
      </SessionFrame>
    );
  }

  const card = deck.length ? deck[qi % deck.length] : undefined;
  return (
    <SessionFrame game={game} live onExit={() => setEnded(true)}>
      <Stage
        canvasRef={canvasRef}
        W={W}
        H={H}
        label={`طاولة الهوكي: ${aliases.A} ${score.A}، ${aliases.B} ${score.B}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {PLAYERS.map((p) => (
          <div
            key={p}
            dir="rtl"
            aria-hidden="true"
            className={`pointer-events-none absolute right-3 flex flex-col items-center leading-none ${
              p === "B" ? "rotate-180" : ""
            }`}
            style={{ top: p === "A" ? "calc(50% + 0.75rem)" : "calc(50% - 4rem)", color: COLOR[p] }}
          >
            <span className="font-bold font-display text-4xl">
              <Num value={score[p]} />
            </span>
            <span className="max-w-20 truncate text-xs opacity-80">{aliases[p]}</span>
          </div>
        ))}

        {asking && card ? (
          <>
            <p
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 text-center font-display font-extrabold text-5xl ${
                asking === "A" ? "top-[18%] rotate-180" : "top-[70%]"
              }`}
              style={{ color: COLOR[other(asking)] }}
            >
              هدف!
            </p>
            <div
              dir="rtl"
              className={`absolute inset-x-3 ${asking === "A" ? "bottom-3" : "top-3 rotate-180"}`}
            >
              <div className="card-in flex flex-col gap-3 rounded-card bg-card p-4 text-ink shadow-lift">
                <p role="status" className="font-semibold text-sm" style={{ color: game.hue }}>
                  دور {aliases[asking]} في الإجابة
                </p>
                <p className="font-bold font-display text-xl leading-snug">{card.body}</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setAnswered((n) => n + 1);
                      setQi((i) => i + 1);
                      serve(asking);
                    }}
                  >
                    أجبت، نكمل
                  </Button>
                  <Button variant="secondary" onClick={() => setQi((i) => i + 1)}>
                    سؤال آخر
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </Stage>
    </SessionFrame>
  );
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, w: World, dt: number, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1f1229");
  bg.addColorStop(0.5, "#35203f");
  bg.addColorStop(1, "#1f1229");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Each half faintly carries its owner's colour; a conceded goal flashes it.
  for (const p of PLAYERS) {
    const top = p === "B" ? 0 : H / 2;
    ctx.fillStyle = COLOR[p];
    ctx.globalAlpha = 0.05 + (w.flash?.who === p ? w.flash.t * 0.3 : 0);
    ctx.fillRect(0, top, W, H / 2);
  }
  ctx.globalAlpha = 1;
  if (w.flash) {
    w.flash.t -= dt;
    if (w.flash.t <= 0) w.flash = null;
  }

  // Markings: centre line, centre circle with a faint heart, goal creases.
  ctx.strokeStyle = "rgba(243, 238, 247, 0.16)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.fillStyle = "rgba(243, 238, 247, 0.06)";
  heartPath(ctx, 26);
  ctx.fill();
  ctx.restore();
  for (const p of PLAYERS) {
    const y = p === "A" ? H : 0;
    ctx.strokeStyle = COLOR[p];
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(W / 2, y, MOUTH + 22, p === "A" ? Math.PI : 0, p === "A" ? Math.PI * 2 : Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
    glow(ctx, COLOR[p], 16);
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W / 2 - MOUTH, p === "A" ? H - 2 : 2);
    ctx.lineTo(W / 2 + MOUTH, p === "A" ? H - 2 : 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
  }

  // Puck trail, then the heart puck itself.
  w.trail.forEach((pt, i) => {
    ctx.globalAlpha = (i / w.trail.length) * 0.25;
    ctx.fillStyle = "#FF6B8B";
    circle(ctx, pt.x, pt.y, PUCK * (0.4 + (0.6 * i) / w.trail.length));
  });
  ctx.globalAlpha = 1;
  if (!w.frozen) {
    ctx.save();
    ctx.translate(w.puck.x, w.puck.y);
    ctx.rotate(w.spin);
    glow(ctx, "#FF6B8B", 22);
    ctx.fillStyle = "#FF6B8B";
    heartPath(ctx, PUCK * 1.05);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.ellipse(-PUCK * 0.4, -PUCK * 0.35, PUCK * 0.22, PUCK * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const p of PLAYERS) {
    const m = w.mallets[p];
    // Until a finger lands on it, each mallet pulses to say "touch me".
    if (!m.touched) {
      ctx.strokeStyle = COLOR[p];
      ctx.globalAlpha = 0.6 - ((t * 0.8) % 1) * 0.6;
      ctx.beginPath();
      ctx.arc(m.x, m.y, MALLET + ((t * 0.8) % 1) * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    glow(ctx, COLOR[p], m.held !== null ? 28 : 12);
    ctx.fillStyle = COLOR[p];
    circle(ctx, m.x, m.y, MALLET);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    circle(ctx, m.x, m.y, MALLET * 0.64);
    ctx.fillStyle = COLOR[p];
    circle(ctx, m.x, m.y, MALLET * 0.44);
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    circle(ctx, m.x - MALLET * 0.14, m.y - MALLET * 0.14, MALLET * 0.16);
  }

  drawParticles(ctx, w.particles, dt);
}
