"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { G17_CARDS } from "@/lib/content";
import type { G17Card } from "@/lib/content/types";
import { drawRemainingMs, G17, G17_ROUNDS, type G17State, wordVisible } from "@/lib/engine/g17";
import type { Event } from "@/lib/engine/types";
import { other } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { readSeen, useSettings } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const CATEGORY: Record<G17Card["category"], string> = {
  objects: "أشياء",
  animals: "حيوانات",
  places: "أماكن",
  actions: "أفعال",
};
const STATUS: Partial<Record<G17State["phase"], string>> = {
  timer_running: "الرسم جارٍ",
  timer_paused: "المؤقّت متوقّف",
  timer_expired: "انتهى الوقت!",
};

/** Flat [x0, y0, x1, y1, …] in canvas units. Lives in React state only, never in the engine. */
type Stroke = number[];
const SIZE = 600;

/** Short expiry beep via WebAudio (only when the user turned sound on). */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    /* no audio available: stay silent */
  }
}

/** G17 — Draw and Guess, pass-and-play on one phone: 6 rounds, alternating artist. */
export function G17Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{
    aliases: { A: string; B: string };
    seen: string[];
  } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G17.availableCount(G17_CARDS, {})}
        requested={G17_ROUNDS}
        onStart={(aliases) => setSession({ aliases, seen: readSeen(game.id) })}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          <Num value={G17_ROUNDS} /> جولات، ثلاث لكلّ رسّام. الشريك يجلس بجانبك ويخمّن بصوت عالٍ؛ عند
          الإصابة اضغطا «خمّنها».
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({
  game,
  aliases: names,
  seen,
}: {
  game: GameMeta;
  aliases: { A: string; B: string };
  seen: string[];
}) {
  const setup = { aliases: names };
  const { state, send, restart } = useSession(G17, G17_CARDS, setup, seen);
  const { aliases, phase, artist } = state;
  const card = state.deck[state.roundIndex];
  const guesser = other(artist);
  const inTimer = phase.startsWith("timer_");
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";

  // The artist confirms holding the phone before the word appears (Handoff pattern).
  const [peekRound, setPeekRound] = useState(-1);
  // Strokes are tagged with their round so a new round starts from a blank canvas.
  const [drawing, setDrawing] = useState<{ round: number; strokes: Stroke[] }>({
    round: 0,
    strokes: [],
  });
  const strokes = drawing.round === state.roundIndex ? drawing.strokes : [];
  const setStrokes = (f: (prev: Stroke[]) => Stroke[]) =>
    setDrawing((d) => ({
      round: state.roundIndex,
      strokes: f(d.round === state.roundIndex ? d.strokes : []),
    }));

  const { settings } = useSettings();
  const hidden = usePageHidden();
  const [now, setNow] = useState(() => Date.now());

  // Wall-clock ticks: the engine flips to timer_expired; the display reads remainingMs.
  useEffect(() => {
    if (phase !== "timer_running") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      send({ type: "TICK", now: t });
    }, 250);
    return () => clearInterval(id);
  }, [phase, send]);

  // Hidden tab pauses; never auto-resumes (FR-CORE-05).
  useEffect(() => {
    if (hidden && phase === "timer_running") send({ type: "PAUSE", now: Date.now() });
  }, [hidden, phase, send]);

  useEffect(() => {
    if (phase === "timer_expired" && settings.sound) beep();
  }, [phase, settings.sound]);

  const act = (type: Event["type"]) => () => send({ type, now: Date.now() } as Event);
  const seconds = Math.ceil(drawRemainingMs(state, now) / 1000);
  const last = state.completedRounds[state.completedRounds.length - 1];

  return (
    <SessionFrame
      game={game}
      live={phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.roundIndex + 1, total: state.deck.length } : undefined}
    >
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {phase === "private_view" && card ? (
        peekRound !== state.roundIndex ? (
          <Handoff toName={aliases[artist]} onReady={() => setPeekRound(state.roundIndex)} />
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            <WordCard
              card={card}
              headline={`${aliases[artist]}، ارسم هذه الكلمة:`}
              hue={game.hue}
            />
            <p className="text-ink-soft">
              لا تكتب الكلمة ولا حروفها. أخفِ الشاشة عن {aliases[guesser]} حتى تضغط «ابدأ الرسم».
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <Button fullWidth onClick={act("READY")}>
                أخفيتها، ابدأ الرسم
              </Button>
              <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                تخطّي
              </Button>
              <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
            </div>
          </div>
        )
      ) : null}

      {inTimer && card ? (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-ink-soft" aria-live="polite">
              {aliases[artist]} يرسم و{aliases[guesser]} يخمّن
            </p>
            <div
              className={`font-bold font-display text-4xl tabular-nums leading-none ${
                phase === "timer_expired" ? "text-danger" : ""
              }`}
            >
              <Num value={seconds} />
            </div>
          </div>
          <Canvas
            strokes={strokes}
            hue={game.hue}
            disabled={phase !== "timer_running"}
            onStroke={(s) => setStrokes((prev) => [...prev, s])}
          />
          <p
            role="status"
            aria-live="polite"
            className="min-h-6 text-center font-semibold text-ink-soft"
          >
            {STATUS[phase]}
          </p>
          {phase === "timer_expired" ? (
            <>
              {/* The word joins the DOM only now: wordVisible(phase) is true for timer_expired. */}
              <WordCard card={card} headline="الكلمة كانت:" hue={game.hue} />
              <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
                التالي
              </Button>
            </>
          ) : (
            <div className="mt-auto flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={strokes.length === 0 || phase !== "timer_running"}
                  onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                >
                  تراجع
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={strokes.length === 0 || phase !== "timer_running"}
                  onClick={() => setStrokes(() => [])}
                >
                  مسح
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={act(phase === "timer_running" ? "PAUSE" : "RESUME")}
                >
                  {phase === "timer_running" ? "إيقاف" : "متابعة"}
                </Button>
              </div>
              <Button fullWidth onClick={() => send({ type: "CORRECT" })}>
                خمّنها!
              </Button>
              <Button variant="ghost" fullWidth onClick={act("SKIP")}>
                تخطّي
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {phase === "reveal" && card && last && wordVisible(phase) ? (
        <div className="flex flex-1 flex-col gap-5">
          <p
            role="status"
            aria-live="polite"
            className="self-start rounded-chip border border-mint bg-mint-soft px-4 py-1.5 font-bold"
          >
            خمّنها {aliases[guesser]}! نقطة لكما
          </p>
          <Canvas strokes={strokes} hue={game.hue} disabled onStroke={() => {}} />
          <WordCard card={card} headline="الكلمة كانت:" hue={game.hue} />
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
            التالي
          </Button>
        </div>
      ) : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

/** The secret word with its accepted alternatives. Rendered only where `wordVisible` allows. */
function WordCard({ card, headline, hue }: { card: G17Card; headline: string; hue: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-ink-soft">{headline}</p>
      <div className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold font-display text-4xl leading-snug">{card.body}</p>
          <FavoriteButton kind="card" id={card.id} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag hue={hue}>{CATEGORY[card.category]}</Tag>
          <Tag>{card.depth === "deep" ? "أصعب" : "سهلة"}</Tag>
        </div>
        {card.synonyms.length ? (
          <p className="text-ink-soft text-sm">
            <span className="font-semibold">تُقبل أيضاً: </span>
            {card.synonyms.join("، ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Pointer-drawn canvas (touch + mouse). Committed strokes come from props and are redrawn on
 * change; the stroke in progress is painted incrementally and handed up on pointer-up.
 * Wrapped in `dir="ltr"` so coordinates never flip under the RTL page.
 */
function Canvas({
  strokes,
  hue,
  disabled,
  onStroke,
}: {
  strokes: Stroke[];
  hue: string;
  disabled: boolean;
  onStroke: (s: Stroke) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);

  const context = () => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return null;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = hue;
    return ctx;
  };
  const paint = (ctx: CanvasRenderingContext2D, s: Stroke, from = 0) => {
    ctx.beginPath();
    ctx.moveTo(s[Math.max(0, from - 2)], s[Math.max(1, from - 1)]);
    for (let i = from; i < s.length; i += 2) ctx.lineTo(s[i], s[i + 1]);
    ctx.stroke();
  };

  useEffect(() => {
    const ctx = context();
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const s of strokes) paint(ctx, s);
    if (current.current) paint(ctx, current.current); // timer ticks re-render mid-stroke
  });

  const point = (e: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE];
  };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    current.current = [x, y, x, y];
    const ctx = context();
    if (ctx) paint(ctx, current.current);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    s.push(...point(e));
    const ctx = context();
    if (ctx) paint(ctx, s, s.length - 2);
  };
  const up = () => {
    if (current.current) onStroke(current.current);
    current.current = null;
  };

  return (
    <div dir="ltr" className="w-full">
      <canvas
        ref={ref}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label="لوحة الرسم"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={`aspect-square w-full touch-none rounded-card border border-line bg-white ${
          disabled ? "" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G17State;
  onReplay: () => void;
}) {
  const r = G17.deriveResult(state);
  const { aliases } = state;
  return (
    <ResultShell
      game={game}
      title={r.completed === 0 ? "لم تُكتمل أي جولة بعد." : `خمّنتما ${r.points} من ${r.completed}`}
      note={state.endedEarly ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما لعبتماه." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "نقاطكما معاً", value: <Num value={r.points} /> },
          { label: `رسمات ${aliases.A} المخمَّنة`, value: <Num value={r.byArtist.A} /> },
          { label: `رسمات ${aliases.B} المخمَّنة`, value: <Num value={r.byArtist.B} /> },
          { label: "جولات مكتملة", value: <Num value={r.completed} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
