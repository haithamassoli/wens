"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { G05_CARDS } from "@/lib/content";
import {
  G05,
  G05_DEFAULT_SECONDS,
  G05_PACKS,
  G05_ROUNDS,
  type G05Pack,
  type G05Setup,
  type G05State,
  g05RemainingMs,
} from "@/lib/engine/g05";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { readSeen, useSettings } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const PACK_LABEL: Record<G05Pack, string> = {
  daily: "يوميات",
  feelings: "مشاعر",
  us: "نحن",
  future: "مستقبل",
};

const STATUS: Partial<Record<G05State["phase"], string>> = {
  timer_ready: "المؤقّت لم يبدأ بعد",
  timer_running: "الوقت يمضي",
  timer_paused: "المؤقّت متوقّف",
  timer_expired: "انتهى الوقت — أكمل على راحتك",
};

/** Short expiry beep via WebAudio (NFR-UX-04: only when the user turned sound on). */
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

/** G05 — Finish the Sentence (FR-G05): setup → instructions → answer + restate ×6 → results. */
export function G05Play({ game }: { game: GameMeta }) {
  const [packs, setPacks] = useState<G05Pack[]>([...G05_PACKS]);
  const [timerOn, setTimerOn] = useState(true);
  const [session, setSession] = useState<{ setup: G05Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  const draft: G05Setup = { packs, timerSeconds: timerOn ? G05_DEFAULT_SECONDS : null };
  const available = G05.availableCount(G05_CARDS, draft);
  const togglePack = (id: G05Pack) =>
    setPacks((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      return next.length ? next : p; // at least one pack
    });

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={available}
        requested={G05_ROUNDS}
        onStart={(aliases) => setSession({ setup: { ...draft, aliases }, seen: readSeen(game.id) })}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">الباقات</legend>
          <div className="flex flex-wrap gap-2">
            {G05_PACKS.map((p) => (
              <Chip
                key={p}
                pressed={packs.includes(p)}
                onToggle={() => togglePack(p)}
                hue={game.hue}
              >
                {PACK_LABEL[p]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">المؤقّت</legend>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={timerOn} onToggle={() => setTimerOn(true)} hue={game.hue}>
              <Num value={G05_DEFAULT_SECONDS} /> ثانية لكل جملة
            </Chip>
            <Chip pressed={!timerOn} onToggle={() => setTimerOn(false)} hue={game.hue}>
              بلا مؤقّت
            </Chip>
          </div>
          <p className="text-ink-soft text-sm">لا حاجة إلى الميكروفون؛ كل شيء يُقال بصوتكما.</p>
        </fieldset>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G05Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G05, G05_CARDS, setup, seen);
  const { settings } = useSettings();
  const hidden = usePageHidden();
  const [now, setNow] = useState(() => Date.now());
  const phase = state.phase;

  const act = useCallback(
    (type: Event["type"]) => () => send({ type, now: Date.now() } as Event),
    [send],
  );

  // Wall-clock ticks: the engine flips to timer_expired; the display reads g05RemainingMs.
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

  const card = state.deck[state.roundIndex];
  const inRound = phase !== "instructions" && phase !== "results" && card !== undefined;
  const speaker = state.aliases[state.speaker];
  const listener = state.aliases[state.speaker === "A" ? "B" : "A"];

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

      {inRound ? (
        <div className="flex flex-1 flex-col gap-5">
          <PlayCard
            headline={phase === "review" ? `الدور على ${listener}` : `أكمل الجملة يا ${speaker}`}
            cardId={card.id}
            body={card.body}
          />

          {phase === "review" ? (
            <p role="status" className="rounded-card bg-mint-soft p-4 text-ink">
              <span className="font-semibold">أعد ما فهمت: </span>
              {`يا ${listener}، أعد بكلماتك ما فهمته من جواب ${speaker}.`}
            </p>
          ) : null}

          {state.timerSeconds !== null && phase !== "review" ? (
            <div className="flex flex-col items-center gap-1 text-center">
              <div
                className={`font-bold font-display text-6xl tabular-nums leading-none ${
                  phase === "timer_expired" ? "text-danger" : ""
                }`}
              >
                <Num value={Math.ceil(g05RemainingMs(state, now) / 1000)} />
              </div>
              <p aria-live="polite" className="min-h-6 font-semibold text-ink-soft">
                {STATUS[phase]}
              </p>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-2">
            {phase === "timer_ready" ? (
              <Button fullWidth onClick={act("READY")}>
                ابدأ الوقت
              </Button>
            ) : null}
            {phase === "timer_running" ? (
              <>
                <Button fullWidth onClick={() => send({ type: "DONE" })}>
                  انتهيت
                </Button>
                <Button variant="secondary" fullWidth onClick={act("PAUSE")}>
                  إيقاف مؤقّت
                </Button>
              </>
            ) : null}
            {phase === "timer_paused" ? (
              <>
                <Button fullWidth onClick={act("RESUME")}>
                  متابعة
                </Button>
                <Button variant="secondary" fullWidth onClick={() => send({ type: "DONE" })}>
                  انتهيت
                </Button>
              </>
            ) : null}
            {phase === "card" || phase === "timer_expired" ? (
              <Button fullWidth onClick={() => send({ type: "DONE" })}>
                انتهيت
              </Button>
            ) : null}
            {phase === "review" ? (
              <Button fullWidth onClick={() => send({ type: "NEXT" })}>
                التالي
              </Button>
            ) : null}
            {/* FR-CORE-04: skip is available in every round phase, pause included. */}
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي
            </Button>
            <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
          </div>
        </div>
      ) : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G05State;
  onReplay: () => void;
}) {
  const r = G05.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title="انتهت الجلسة"
      note={
        r.completed === 0
          ? "لم تُكتمل أي جملة بعد."
          : state.endedEarly
            ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما أكملتماه."
            : undefined
      }
      onReplay={onReplay}
    >
      {/* No points (FR-G05 Result): completed / skipped only. */}
      <Stats
        rows={[
          { label: "جمل مكتملة", value: <Num value={r.completed} /> },
          { label: "جمل متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
