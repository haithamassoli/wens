"use client";

import { type PointerEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { Num } from "@/components/Num";
import { SessionFrame } from "@/components/play/SessionFrame";
import { nearestStar, segmentHitsCircle, starField } from "@/lib/engine/arcade";
import { countNoun } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { useGameData, useSettings, useStorageAvailable } from "@/lib/storage";
import { ConfirmDelete, DateText, Field, INPUT_CLASS, todayISO } from "./shared/album";
import { glow, PENTATONIC, Stage, toCanvas, tone, useCanvasLoop } from "./shared/arcade";

const W = 360;
const H = 600;
const MOON = { x: W - 58, y: 64, r: 20 };
const MIN_STARS = 3;
const NAME_MAX = 30;
// Segments alternate warm/cool so the finished shape shows the two of you took turns.
const TURN = ["#FFC46B", "#7FE0D0"] as const;
const KIND = { memory: "ذكرى", dream: "حلم" } as const;
const FORMS = { one: "كوكبة", two: "كوكبتان", few: "كوكبات", many: "كوكبة" };
const PROMPTS = [
  "أول مكان خرجنا إليه معاً",
  "يوم ضحكنا فيه حتى دمعت أعيننا",
  "رحلة نحلم بها",
  "البيت الذي نتخيّله",
  "أكلة لها قصة بيننا",
  "لحظة شعرنا فيها أننا فريق",
  "شيء نريد أن نتعلّمه معاً",
  "مكان نحبّ أن نعود إليه",
  "عادة صغيرة نحبّها بيننا",
  "حلم لهذا العام",
  "يوم عادي صار ذكرى",
  "هدية لا تُنسى",
];

type Kind = keyof typeof KIND;
interface Constellation {
  id: string;
  name: string;
  kind: Kind;
  stars: number[]; // indices into the seeded star field, in drawing order
  at: string; // YYYY-MM-DD
}
interface Sky {
  seed: number; // 0 until the first save; the sky is then the same on every visit
  list: Constellation[];
}

/** G39 — Our Sky: a private night sky; each constellation you draw together is a memory or a dream. */
export function G39Play({ game }: { game: GameMeta }) {
  const [sky, setSky, hydrated] = useGameData<Sky>("G39", { seed: 0, list: [] });
  const storage = useStorageAvailable();
  const { settings } = useSettings();
  const [draftSeed] = useState(() => 1 + Math.floor(Math.random() * 2 ** 30));
  const seed = sky.seed || draftSeed;
  const stars = useMemo(
    () =>
      starField(seed, 95, W, H).filter((s) => Math.hypot(s.x - MOON.x, s.y - MOON.y) > MOON.r + 18),
    [seed],
  );

  const [mode, setMode] = useState<"view" | "draw" | "name">("view");
  const [path, setPath] = useState<number[]>([]);
  const [prompt, setPrompt] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("memory");
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  // Animation-only state the loop reads; never rendered by React.
  const fx = useRef({
    pathAt: [] as number[], // when each path star was added (segments grow in)
    taps: [] as { x: number; y: number; t0: number }[],
    born: null as { id: string; t0: number } | null,
    shooting: null as { x: number; y: number; t0: number } | null,
    nextShot: 3,
  });
  const still =
    settings.reduceMotion ||
    (typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

  const canvasRef = useCanvasLoop(W, H, (ctx, dt, t) => {
    const f = fx.current;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#070513");
    bg.addColorStop(0.55, "#161033");
    bg.addColorStop(1, "#2d1b45");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const horizon = ctx.createRadialGradient(W / 2, H + 60, 10, W / 2, H + 60, 300);
    horizon.addColorStop(0, "rgba(240, 162, 59, 0.22)");
    horizon.addColorStop(1, "rgba(240, 162, 59, 0)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, W, H);

    // Crescent moon: an even halo first, then the lit disc clipped by a second disc so the
    // dark side shows the (haloed) sky rather than a darker patch.
    const halo = ctx.createRadialGradient(
      MOON.x,
      MOON.y,
      MOON.r * 0.8,
      MOON.x,
      MOON.y,
      MOON.r * 2.8,
    );
    halo.addColorStop(0, "rgba(255, 233, 184, 0.22)");
    halo.addColorStop(1, "rgba(255, 233, 184, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(MOON.x - MOON.r * 3, MOON.y - MOON.r * 3, MOON.r * 6, MOON.r * 6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(MOON.x + 9, MOON.y - 6, MOON.r * 0.9, 0, Math.PI * 2);
    ctx.clip("evenodd");
    glow(ctx, "#FFE9B8", 8);
    ctx.fillStyle = "#FFF1CF";
    ctx.beginPath();
    ctx.arc(MOON.x, MOON.y, MOON.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!hydrated) return;

    // Shooting star now and then (skipped under reduced motion).
    if (!still) {
      f.nextShot -= dt;
      if (f.nextShot <= 0) {
        f.shooting = { x: 60 + Math.random() * (W - 60), y: 20 + Math.random() * H * 0.35, t0: t };
        f.nextShot = 6 + Math.random() * 8;
      }
      if (f.shooting) {
        const k = (t - f.shooting.t0) / 0.9;
        if (k > 1) f.shooting = null;
        else {
          const x = f.shooting.x - k * 220;
          const y = f.shooting.y + k * 130;
          const tail = ctx.createLinearGradient(x, y, x + 70, y - 41);
          tail.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - k)})`);
          tail.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.strokeStyle = tail;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 70, y - 41);
          ctx.stroke();
        }
      }
    }

    // Saved constellations: soft gold, brighter when selected or just born.
    const lit = new Set<number>();
    for (const c of sky.list) {
      const born = f.born?.id === c.id ? Math.max(0, 1 - (t - f.born.t0) / 2.5) : 0;
      const on = selected === c.id;
      ctx.strokeStyle = `rgba(255, 227, 163, ${mode === "view" ? (on ? 0.95 : 0.45 + born * 0.5) : 0.2})`;
      ctx.lineWidth = on || born ? 2 : 1.3;
      if (on || born) glow(ctx, "#FFD27A", 10 + born * 20);
      ctx.beginPath();
      c.stars.forEach((i, k) => {
        const s = stars[i];
        if (!s) return;
        lit.add(i);
        if (k === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // The constellation being drawn: each new segment grows out of the previous star.
    if (mode !== "view") {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let k = 1; k < path.length; k++) {
        const a = stars[path[k - 1]];
        const b = stars[path[k]];
        const g = still ? 1 : Math.min(1, (t - (f.pathAt[k] ?? 0)) / 0.3);
        glow(ctx, TURN[(k - 1) % 2], 12);
        ctx.strokeStyle = TURN[(k - 1) % 2];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + (b.x - a.x) * g, a.y + (b.y - a.y) * g);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      for (const i of path) lit.add(i);
    }

    ctx.fillStyle = "#FFFFFF";
    stars.forEach((s, i) => {
      const on = lit.has(i);
      ctx.globalAlpha = on ? 1 : still ? 0.8 : 0.5 + 0.45 * Math.sin(t * 1.4 + s.phase);
      if (on) glow(ctx, "#FFE3A3", 10);
      ctx.beginPath();
      ctx.arc(s.x, s.y, on ? s.r + 1.2 : s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    for (let i = f.taps.length - 1; i >= 0; i--) {
      const p = f.taps[i];
      const k = (t - p.t0) / 0.6;
      if (k > 1) {
        f.taps.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(255, 227, 163, ${1 - k})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + k * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  const now = () => performance.now() / 1000;
  const tap = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = toCanvas(e, W, H, e.currentTarget);
    if (mode === "draw") {
      const i = nearestStar(stars, p.x, p.y, 28);
      if (i < 0 || i === path.at(-1)) return;
      fx.current.pathAt[path.length] = now();
      fx.current.taps.push({ x: stars[i].x, y: stars[i].y, t0: now() });
      setPath([...path, i]);
      // Higher stars ring higher, so drawing plays a little tune.
      if (settings.sound)
        tone(PENTATONIC[Math.floor((1 - stars[i].y / H) * (PENTATONIC.length - 0.01))], 420);
    } else if (mode === "view") {
      const hit = sky.list.findLast((c) =>
        c.stars.some((i, k) => {
          const a = stars[i];
          const b = stars[c.stars[k + 1] ?? i];
          return a && b && segmentHitsCircle(a.x, a.y, b.x, b.y, p.x, p.y, 16);
        }),
      );
      setSelected(hit?.id ?? null);
    }
  };

  const startDrawing = () => {
    setSelected(null);
    setPath([]);
    setMode("draw");
  };
  const save = () => {
    const c: Constellation = {
      id: `${Date.now()}`,
      name: name.trim().slice(0, NAME_MAX),
      kind,
      stars: path,
      at: todayISO(),
    };
    setSky((s) => ({ seed: s.seed || seed, list: [...s.list, c] }));
    fx.current.born = { id: c.id, t0: now() };
    if (settings.sound)
      for (const [i, f] of [PENTATONIC[0], PENTATONIC[2], PENTATONIC[4], PENTATONIC[5]].entries())
        tone(f, 700, "sine", 0.08, i * 0.12);
    setPath([]);
    setName("");
    setMode("view");
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  };

  const chosen = sky.list.find((c) => c.id === selected);
  const labels =
    mode === "view"
      ? sky.list.flatMap((c) => {
          const pts = c.stars.map((i) => stars[i]).filter(Boolean);
          if (!pts.length) return [];
          const x = pts.reduce((sum, s) => sum + s.x, 0) / pts.length;
          const y = Math.max(...pts.map((s) => s.y)) + 12;
          return [{ c, x, y: Math.min(y, H - 24) }];
        })
      : [];

  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-3">
        {mode === "view" ? (
          <p className="text-ink-soft" role="status">
            {sky.list.length === 0 ? (
              "سماؤكما صافية وتنتظر أول كوكبة."
            ) : (
              <>
                في سمائكما{" "}
                {sky.list.length === 1 ? (
                  "كوكبة واحدة"
                ) : sky.list.length === 2 ? (
                  "كوكبتان"
                ) : (
                  <>
                    <Num value={sky.list.length} /> {countNoun(sky.list.length, FORMS)}
                  </>
                )}
                . المسا أيّ كوكبة لتريا تفاصيلها.
              </>
            )}
          </p>
        ) : (
          <div className="card-in flex items-center justify-between gap-3 rounded-card bg-card px-4 py-3">
            <div>
              <p className="text-ink-soft text-sm">ارسما كوكبة عن:</p>
              <p className="font-bold font-display text-lg leading-snug">{PROMPTS[prompt]}</p>
            </div>
            <Button
              variant="ghost"
              className="!min-h-11 !px-3 shrink-0 text-sm"
              onClick={() => setPrompt((p) => (p + 1) % PROMPTS.length)}
            >
              فكرة أخرى
            </Button>
          </div>
        )}

        <Stage
          canvasRef={canvasRef}
          W={W}
          H={H}
          reserve="17rem"
          label={
            sky.list.length
              ? `سماء فيها: ${sky.list.map((c) => c.name).join("، ")}`
              : "سماء ليلية بلا كوكبات بعد"
          }
          onPointerDown={tap}
        >
          {labels.map(({ c, x, y }) => (
            <button
              key={c.id}
              type="button"
              dir="rtl"
              onClick={() => setSelected(c.id === selected ? null : c.id)}
              className="absolute max-w-32 -translate-x-1/2 truncate rounded-chip px-2 py-0.5 font-display text-[#FFE3A3] text-xs hover:bg-white/10"
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
            >
              {c.name}
            </button>
          ))}
          {toast ? (
            <p
              role="status"
              dir="rtl"
              className="card-in absolute top-4 left-1/2 -translate-x-1/2 rounded-chip bg-card/95 px-4 py-1.5 font-semibold text-ink text-sm shadow-lift"
            >
              أُضيفت إلى سمائكما
            </p>
          ) : null}
        </Stage>

        {storage ? null : (
          <p role="status" className="rounded-xl bg-ground-deep p-3 text-danger text-sm">
            الحفظ غير متاح على هذا المتصفح، ولن تبقى الكوكبات بعد إغلاق الصفحة.
          </p>
        )}

        {mode === "view" && chosen ? (
          <div className="card-in flex flex-col gap-2 rounded-card bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold font-display text-xl leading-snug">{chosen.name}</p>
              <Tag hue={game.hue}>{KIND[chosen.kind]}</Tag>
            </div>
            <p className="text-ink-soft text-sm">
              رُسمت في <DateText iso={chosen.at} />
            </p>
            <div className="flex items-center justify-between gap-2">
              <ConfirmDelete
                question="حذف هذه الكوكبة من سمائكما؟"
                onConfirm={() => {
                  setSky((s) => ({ ...s, list: s.list.filter((c) => c.id !== chosen.id) }));
                  setSelected(null);
                }}
              />
              <Button variant="secondary" onClick={() => setSelected(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "view" && !chosen ? (
          <Button fullWidth className="mt-auto" disabled={!hydrated} onClick={startDrawing}>
            ارسما كوكبة جديدة
          </Button>
        ) : null}

        {mode === "draw" ? (
          <div className="mt-auto flex flex-col gap-2">
            <p className="text-center text-ink-soft text-sm" role="status">
              {path.length === 0 ? (
                "تناوبا على لمس النجوم، ومع كل نجمة قولا تفصيلاً صغيراً من الحكاية."
              ) : (
                <>
                  نجوم: <Num value={path.length} />
                  {path.length < MIN_STARS ? (
                    <>
                      {" "}
                      (<Num value={MIN_STARS} /> على الأقل)
                    </>
                  ) : null}
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={path.length < MIN_STARS}
                onClick={() => setMode("name")}
              >
                انتهينا
              </Button>
              <Button
                variant="secondary"
                disabled={path.length === 0}
                onClick={() => setPath(path.slice(0, -1))}
              >
                تراجع
              </Button>
              <Button variant="ghost" onClick={() => setMode("view")}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "name" ? (
          <form
            className="card-in mt-auto flex flex-col gap-3 rounded-card bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && name.length <= NAME_MAX) save();
            }}
          >
            <Field id="g39-name" label="اسم الكوكبة" value={name} max={NAME_MAX}>
              <input
                id="g39-name"
                className={INPUT_CLASS}
                value={name}
                maxLength={NAME_MAX}
                autoComplete="off"
                placeholder="مثلاً: شاي على البحر"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <fieldset className="flex gap-2">
              <legend className="sr-only">نوعها</legend>
              {(Object.keys(KIND) as Kind[]).map((k) => (
                <Chip key={k} pressed={kind === k} onToggle={() => setKind(k)} hue={game.hue}>
                  {KIND[k]}
                </Chip>
              ))}
            </fieldset>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!name.trim()}>
                أضيفاها إلى السماء
              </Button>
              <Button variant="secondary" onClick={() => setMode("draw")}>
                رجوع
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </SessionFrame>
  );
}
