"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G25_CARDS } from "@/lib/content";
import type { WheelCard } from "@/lib/content/types";
import { G25, type G25Setup, type G25State } from "@/lib/engine/g25";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen, useSettings } from "@/lib/storage";

const LOCATIONS: [G25Setup["location"], ReactNode][] = [
  ["indoor", "في البيت"],
  ["outdoor", "خارج البيت"],
  ["any", "لا يهم"],
];
const COSTS: [G25Setup["costTier"], ReactNode][] = [
  ["free", "بلا تكلفة"],
  ["low", "تكلفة بسيطة"],
  ["flexible", "مرن"],
  ["any", "لا يهم"],
];
const MINUTES: [number | null, ReactNode][] = [
  ...[30, 60, 120].map((m): [number, ReactNode] => [
    m,
    <>
      <Num value={m} /> دقيقة
    </>,
  ]),
  [null, "لا يهم"],
];
const CARD_LOCATION: Record<WheelCard["location"], string> = {
  indoor: "في البيت",
  outdoor: "خارج البيت",
  any: "في أي مكان",
};
const CARD_COST: Record<WheelCard["costTier"], string> = {
  free: "بلا تكلفة",
  low: "تكلفة بسيطة",
  flexible: "تكلفة مرنة",
};
const SEGMENTS = [
  "#3B82F6",
  "#F0A23B",
  "#D9647A",
  "#2F9E8F",
  "#7A5AF8",
  "#E8663D",
  "#C47C17",
  "#A898B3",
];
const SPIN_MS = 1800;

const activities = (n: number) =>
  n === 1 ? (
    "نشاط واحد مطابق"
  ) : n === 2 ? (
    "نشاطان مطابقان"
  ) : (
    <>
      <Num value={n} /> {n <= 10 ? "أنشطة مطابقة" : "نشاطاً مطابقاً"}
    </>
  );

const segmentPath = (i: number) => {
  const pt = (a: number) => `${100 + 96 * Math.cos(a)} ${100 + 96 * Math.sin(a)}`;
  const step = (Math.PI * 2) / SEGMENTS.length;
  return `M100 100 L${pt(i * step)} A96 96 0 0 1 ${pt((i + 1) * step)} Z`;
};

/** Decorative wheel: the engine chose the result before the animation began (FR-G25). */
function Wheel({ rotation }: { rotation: number }) {
  return (
    <div className="relative mx-auto w-full max-w-64">
      <svg viewBox="0 0 200 200" className="w-full drop-shadow-lg" aria-hidden="true">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "100px 100px",
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
          }}
        >
          {SEGMENTS.map((c, i) => (
            <path key={c} d={segmentPath(i)} fill={c} />
          ))}
          <circle cx="100" cy="100" r="96" fill="none" stroke="#fff" strokeWidth="4" />
          <circle cx="100" cy="100" r="14" fill="#fff" />
        </g>
        <path d="M100 2 L90 20 L110 20 Z" fill="var(--color-ink)" />
      </svg>
    </div>
  );
}

export function G25Play({ game }: { game: GameMeta }) {
  const [setup, setSetup] = useState<G25Setup>({
    location: "any",
    costTier: "any",
    maxMinutes: null,
    noTools: false,
  });
  const patch = (p: Partial<G25Setup>) => setSetup((s) => ({ ...s, ...p }));
  const available = G25.availableCount(G25_CARDS, setup);

  const [state, setState] = useState<G25State | null>(null);
  const send = useCallback((e: Event) => setState((s) => (s ? G25.reduce(s, e) : s)), []);
  const start = () =>
    setState(G25.initialState(G25.buildDeck(G25_CARDS, setup, readSeen("G25")), setup));

  const { settings } = useSettings();
  const [rotation, setRotation] = useState(0);
  const phase = state?.phase;
  const selectedId = state?.selectedId ?? null;

  // Spin: animate, then NEXT. Reduced motion (setting or media query) reveals instantly.
  useEffect(() => {
    if (phase !== "wheel_spinning") return;
    const reduce =
      settings.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      send({ type: "NEXT" });
      return;
    }
    setRotation((r) => r + 1440 + Math.floor(Math.random() * 360));
    const id = setTimeout(() => send({ type: "NEXT" }), SPIN_MS);
    return () => clearTimeout(id);
  }, [phase, settings.reduceMotion, send]);

  useEffect(() => {
    if (phase === "wheel_result" && selectedId) markSeen("G25", [selectedId]);
  }, [phase, selectedId]);

  if (!state) {
    const group = <K extends keyof G25Setup>(
      key: K,
      label: string,
      options: [G25Setup[K], ReactNode][],
    ) => (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([value, text]) => (
            <Chip
              key={String(value)}
              pressed={setup[key] === value}
              onToggle={() => patch({ [key]: value } as Partial<G25Setup>)}
              hue={game.hue}
            >
              {text}
            </Chip>
          ))}
        </div>
      </fieldset>
    );
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">ماذا يناسبكما الآن؟</h2>
          {group("location", "المكان", LOCATIONS)}
          {group("costTier", "التكلفة", COSTS)}
          {group("maxMinutes", "الوقت المتاح", MINUTES)}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">الأدوات</legend>
            <div>
              <Chip
                pressed={setup.noTools}
                onToggle={() => patch({ noTools: !setup.noTools })}
                hue={game.hue}
              >
                بدون أدوات
              </Chip>
            </div>
          </fieldset>
          <p role="status" className={available === 0 ? "font-semibold" : "text-ink-soft"}>
            {available === 0
              ? "لا نشاط يطابق هذه الاختيارات. جرّبا تغيير أحد الفلاتر."
              : activities(available)}
          </p>
          <Button fullWidth className="mt-auto" disabled={available === 0} onClick={start}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const selected = selectedId ? state.deck.find((c) => c.id === selectedId) : undefined;

  if (state.phase === "results") {
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={
            selected
              ? state.done
                ? "فعلتماها!"
                : "نشاطكما"
              : state.shown.length
                ? "انتهت الجلسة"
                : "لم يُختَر نشاط بعد."
          }
          onReplay={start}
        >
          {selected ? <p className="text-lg">{selected.body}</p> : null}
        </ResultShell>
      </SessionFrame>
    );
  }

  if (state.phase === "instructions") {
    return (
      <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
        <div className="flex flex-1 flex-col gap-6">
          <ol className="flex flex-col gap-3">
            {game.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-card bg-card p-4">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white"
                  style={{ backgroundColor: game.hue }}
                >
                  <Num value={i + 1} />
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <h2 className="mt-auto text-center font-bold font-display text-3xl">مستعدّان؟</h2>
          <Button fullWidth onClick={() => send({ type: "START" })}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const spinning = state.phase === "wheel_spinning";
  const showWheel = state.pool.length > 1;

  return (
    <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
      <div className="flex flex-1 flex-col gap-6">
        {showWheel ? <Wheel rotation={rotation} /> : null}
        <p role="status" className="text-center font-semibold text-ink-soft">
          {spinning
            ? "العجلة تدور…"
            : state.phase !== "wheel_result"
              ? ""
              : showWheel
                ? "اختارت العجلة:"
                : "النشاط الوحيد المطابق:"}
        </p>

        {state.phase === "wheel_result" && selected ? (
          <article
            className="rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
            style={{ borderColor: game.hue }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold font-display text-2xl leading-snug">{selected.body}</p>
              <FavoriteButton kind="card" id={selected.id} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Tag hue={game.hue}>{CARD_LOCATION[selected.location]}</Tag>
              <Tag>{CARD_COST[selected.costTier]}</Tag>
              <Tag>
                <Num value={`${selected.minMinutes}–${selected.maxMinutes}`} /> دقيقة
              </Tag>
              {selected.materials.map((m) => (
                <Tag key={m}>يحتاج: {m}</Tag>
              ))}
              {selected.requiresTools && selected.materials.length === 0 ? (
                <Tag>يحتاج أدوات</Tag>
              ) : null}
            </div>
            {state.done ? (
              <p
                role="status"
                className="mt-4 rounded-xl bg-mint-soft p-3 text-center font-semibold"
              >
                فعلناها! أحسنتما.
              </p>
            ) : null}
          </article>
        ) : null}

        {state.exhausted ? (
          <div className="rounded-card bg-card p-6 text-center">
            <p className="font-semibold text-lg">عرضنا كل الأنشطة المطابقة. نبدأ من جديد؟</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                fullWidth
                onClick={() => {
                  send({ type: "RESET_POOL" });
                  send({ type: "SPIN" });
                }}
              >
                نعم، من جديد
              </Button>
              <Button variant="secondary" fullWidth onClick={() => send({ type: "END" })}>
                لا، نكتفي
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {state.phase === "wheel_result" ? (
            <>
              {state.done ? null : (
                <Button fullWidth onClick={() => send({ type: "DONE" })}>
                  فعلناها!
                </Button>
              )}
              <Button
                variant={state.done ? "primary" : "secondary"}
                fullWidth
                onClick={() => send({ type: "SPIN" })}
              >
                خيار آخر
              </Button>
              <Button variant="ghost" fullWidth href={`/games/${game.slug}`}>
                العودة إلى اللعبة
              </Button>
              <Button variant="ghost" fullWidth href="/">
                الرئيسية
              </Button>
            </>
          ) : state.exhausted ? null : (
            <Button fullWidth disabled={spinning} onClick={() => send({ type: "SPIN" })}>
              أديرا العجلة
            </Button>
          )}
        </div>
      </div>
    </SessionFrame>
  );
}
