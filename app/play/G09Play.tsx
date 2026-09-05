"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { G09_CARDS } from "@/lib/content";
import type { TimerCard } from "@/lib/content/types";
import { G09, G09_ROUNDS, type G09Setup, type G09State, remainingMs } from "@/lib/engine/g09";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen, useSettings } from "@/lib/storage";

const CATEGORY: Record<string, string> = { verbal: "كلامي", acting: "تمثيل", movement: "حركة" };
const STATUS: Partial<Record<G09State["phase"], string>> = {
  timer_ready: "المؤقّت لم يبدأ بعد",
  timer_running: "بدأ المؤقّت",
  timer_paused: "المؤقّت متوقّف",
  timer_expired: "انتهى الوقت!",
};

const challenges = (n: number) =>
  n === 1 ? (
    "تحدٍّ واحد"
  ) : n === 2 ? (
    "تحدّيان"
  ) : (
    <>
      <Num value={n} /> {n <= 10 ? "تحديات" : "تحدياً"}
    </>
  );

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

export function G09Play({ game }: { game: GameMeta }) {
  const [aliases, setAliases] = useState({ A: "", B: "" });
  const [noTools, setNoTools] = useState(false);
  const [noMovement, setNoMovement] = useState(false);
  const setup: G09Setup = { aliases, noTools, noMovement };
  const available = G09.availableCount(G09_CARDS, setup);

  const [state, setState] = useState<G09State | null>(null);
  const send = useCallback((e: Event) => setState((s) => (s ? G09.reduce(s, e) : s)), []);
  const start = () =>
    setState(G09.initialState(G09.buildDeck(G09_CARDS, setup, readSeen("G09")), setup));

  const phase = state?.phase;
  const inTimer = phase?.startsWith("timer_") ?? false;
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

  // Seen history: ids of the cards actually dealt (FR-CORE-07).
  useEffect(() => {
    if (state?.phase !== "results") return;
    const shown = state.endedEarly ? state.roundIndex + 1 : state.deck.length;
    markSeen(
      "G09",
      state.deck.slice(0, shown).map((c) => c.id),
    );
  }, [state]);

  if (!state) {
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">قبل أن نبدأ</h2>
          <AliasFields value={aliases} onChange={setAliases} />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">الفلاتر</legend>
            <div className="flex flex-wrap gap-2">
              <Chip pressed={noTools} onToggle={() => setNoTools((v) => !v)} hue={game.hue}>
                بدون أدوات
              </Chip>
              <Chip pressed={noMovement} onToggle={() => setNoMovement((v) => !v)} hue={game.hue}>
                بدون حركة
              </Chip>
            </div>
          </fieldset>
          <p role="status" className={available < G09_ROUNDS ? "font-semibold" : "text-ink-soft"}>
            {available === 0 ? (
              "لا تحديات تطابق هذه الاختيارات. جرّبا إزالة أحد الفلاتر."
            ) : available < G09_ROUNDS ? (
              <>متاح {challenges(available)} فقط، وسنلعبها كلها.</>
            ) : (
              <>متاح {challenges(available)}، سنلعب خمسة منها.</>
            )}
          </p>
          <p className="text-ink-soft text-sm">إجابات الجولات مؤقّتة وتُمسح عند الخروج.</p>
          <Button fullWidth className="mt-auto" disabled={available === 0} onClick={start}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  if (state.phase === "results") {
    const { completed, skipped } = G09.deriveResult(state);
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={
            completed + skipped === 0
              ? "لم تُكتمل أي جولة بعد."
              : `أنجزتما ${completed} من ${state.deck.length}`
          }
          note={state.endedEarly ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما لعبتماه." : undefined}
          onReplay={start}
        >
          <dl className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-mint-soft p-3">
              <dt className="text-ink-soft text-sm">مكتملة</dt>
              <dd className="font-bold font-display text-3xl">
                <Num value={completed} />
              </dd>
            </div>
            <div className="rounded-xl bg-ground p-3">
              <dt className="text-ink-soft text-sm">متخطّاة</dt>
              <dd className="font-bold font-display text-3xl">
                <Num value={skipped} />
              </dd>
            </div>
          </dl>
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

  const card: TimerCard = state.deck[state.roundIndex];
  const seconds = Math.ceil(remainingMs(state, now) / 1000);
  const act = (type: Event["type"]) => () => send({ type, now: Date.now() } as Event);

  return (
    <SessionFrame
      game={game}
      live={inTimer}
      progress={{ current: state.roundIndex + 1, total: state.deck.length }}
      onExit={() => send({ type: "END" })}
    >
      <div className="flex flex-1 flex-col gap-5">
        <article
          className="rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
          style={{ borderColor: game.hue }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Tag hue={game.hue}>
                <Num value={card.durationSeconds} /> ثانية
              </Tag>
              {CATEGORY[card.category] ? <Tag>{CATEGORY[card.category]}</Tag> : null}
              {card.requiresTools ? <Tag>يحتاج أدوات</Tag> : null}
              {card.requiresMovement ? <Tag>فيه حركة</Tag> : null}
            </div>
            <FavoriteButton kind="card" id={card.id} />
          </div>
          <p className="mt-4 font-bold font-display text-2xl leading-snug">{card.body}</p>
          {card.steps.length ? (
            <ol className="mt-4 flex list-inside list-decimal flex-col gap-1 text-ink-soft">
              {card.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ) : null}
          {card.alternative ? (
            <p className="mt-4 rounded-xl bg-ground p-3 text-sm">
              <span className="font-semibold">بديل أسهل: </span>
              {card.alternative}
            </p>
          ) : null}
        </article>

        <div className="flex flex-col items-center gap-1 text-center">
          <div
            className={`font-bold font-display text-7xl tabular-nums leading-none ${
              state.phase === "timer_expired" ? "text-danger" : ""
            }`}
          >
            <Num value={seconds} />
          </div>
          <p aria-live="polite" className="min-h-6 font-semibold text-ink-soft">
            {STATUS[state.phase]}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {state.phase === "timer_ready" ? (
            <Button fullWidth onClick={act("READY")}>
              مستعدّان
            </Button>
          ) : null}
          {state.phase === "timer_running" ? (
            <>
              <Button fullWidth onClick={act("DONE")}>
                أنجزناه
              </Button>
              <Button variant="secondary" fullWidth onClick={act("PAUSE")}>
                إيقاف مؤقّت
              </Button>
            </>
          ) : null}
          {state.phase === "timer_paused" ? (
            <>
              <Button fullWidth onClick={act("RESUME")}>
                متابعة
              </Button>
              <Button variant="secondary" fullWidth onClick={act("DONE")}>
                أنجزناه
              </Button>
            </>
          ) : null}
          {state.phase === "timer_expired" ? (
            <Button fullWidth onClick={act("DONE")}>
              أنجزناه
            </Button>
          ) : null}
          <Button variant="ghost" fullWidth onClick={act("SKIP")}>
            تخطّي
          </Button>
        </div>
      </div>
    </SessionFrame>
  );
}
