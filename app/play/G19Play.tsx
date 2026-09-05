"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { G19_CARDS } from "@/lib/content";
import type { G19Card } from "@/lib/content/types";
import {
  currentLock,
  elapsedMs,
  G19,
  type G19Setup,
  type G19State,
  LOCKS,
  type Progress,
  progressOf,
} from "@/lib/engine/g19";
import type { Aliases, Event } from "@/lib/engine/types";
import { countNoun, MINUTE_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen, useGameData } from "@/lib/storage";
import { Instructions, Stats } from "./Setup";

const CATEGORY: Record<string, string> = { family: "عائلة", travel: "سفر", mystery: "لغز" };
const INPUT =
  "min-h-11 w-full rounded-xl border border-line bg-card px-4 py-2 text-base text-ink placeholder:text-ink-faint";
const LOCK_PHASES = new Set(["handoff", "private_view", "input", "reveal"]);

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * G19 — The Shared Escape Room (FR-G19). One story, four locks; each player reads their own clue
 * privately (Handoff), then both answer. Progress (story, lock, counters, start time) is stored
 * locally so the pair can resume. ponytail: one phone; the two-device variant is Convex sync.
 */
export function G19Play({ game }: { game: GameMeta }) {
  const [progress, setProgress, hydrated] = useGameData<Progress | null>("G19", null);
  const [session, setSession] = useState<G19Setup | null>(null);

  if (session)
    return (
      <Session
        game={game}
        setup={session}
        onProgress={setProgress}
        onDone={() => setSession(null)}
      />
    );

  return (
    <SessionFrame game={game}>
      <Setup
        game={game}
        saved={hydrated ? progress : null}
        onStart={(setup) => setSession(setup)}
        onDiscard={() => setProgress(null)}
      />
    </SessionFrame>
  );
}

function Setup({
  game,
  saved,
  onStart,
  onDiscard,
}: {
  game: GameMeta;
  saved: Progress | null;
  onStart: (setup: G19Setup) => void;
  onDiscard: () => void;
}) {
  const stories = G19_CARDS.filter((c) => c.status === "published");
  const [aliases, setAliases] = useState<Aliases>({ A: "", B: "" });
  const [storyId, setStoryId] = useState<string>(saved?.storyId ?? stories[0]?.id ?? "");
  const savedStory = saved ? stories.find((c) => c.id === saved.storyId) : undefined;
  const resumable = savedStory && saved && saved.lockIndex < LOCKS;

  return (
    <form
      className="flex flex-1 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (storyId) onStart({ aliases, storyId, resume: null });
      }}
    >
      <p className="text-ink-soft">{game.tagline}</p>
      <AliasFields value={aliases} onChange={setAliases} />

      {resumable ? (
        <section
          aria-labelledby="resume-title"
          className="flex flex-col gap-3 rounded-card bg-mint-soft p-4"
        >
          <h2 id="resume-title" className="font-semibold">
            لديكما قصة لم تكتمل: {savedStory.title}
          </h2>
          <p className="text-ink-soft text-sm">
            توقّفتما عند القفل <Num value={saved.lockIndex + 1} /> من <Num value={LOCKS} />.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={() => onStart({ aliases, storyId: saved.storyId, resume: saved })}
            >
              متابعة
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onDiscard}>
              بداية جديدة
            </Button>
          </div>
        </section>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">القصة</legend>
        {stories.map((c) => {
          const on = c.id === storyId;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => setStoryId(c.id)}
              style={on ? { borderColor: game.hue } : undefined}
              className={`flex min-h-14 flex-col gap-1 rounded-2xl border-2 bg-card px-5 py-3 text-start ${
                on ? "" : "border-line hover:border-ink-faint"
              }`}
            >
              <span className="font-semibold text-lg">{c.title}</span>
              <span className="flex flex-wrap gap-1.5">
                <Tag hue={game.hue}>{CATEGORY[c.category] ?? c.category}</Tag>
                <Tag>
                  <Num value={c.estimatedMinutes} /> {countNoun(c.estimatedMinutes, MINUTE_FORMS)}
                </Tag>
              </span>
            </button>
          );
        })}
      </fieldset>

      <div className="mt-auto flex flex-col gap-3">
        <p className="text-center text-ink-soft text-sm">
          يُحفظ على هذا الهاتف موضعكما في القصة فقط، لا إجاباتكما.
        </p>
        <Button type="submit" fullWidth disabled={!storyId}>
          ابدأ
        </Button>
      </div>
    </form>
  );
}

function Session({
  game,
  setup,
  onProgress,
  onDone,
}: {
  game: GameMeta;
  setup: G19Setup;
  onProgress: (p: Progress | null) => void;
  onDone: () => void;
}) {
  const [state, setState] = useState<G19State>(() =>
    G19.initialState(G19.buildDeck(G19_CARDS, setup, readSeen("G19")), setup),
  );
  const send = useCallback((e: Event) => setState((s) => G19.reduce(s, e)), []);
  const restart = () => {
    const fresh = { ...setup, resume: null };
    setState(G19.initialState(G19.buildDeck(G19_CARDS, fresh, readSeen("G19")), fresh));
  };

  const { phase, aliases } = state;
  const story: G19Card | undefined = state.deck[0];
  const lock = currentLock(state);
  const inLock = LOCK_PHASES.has(phase);
  const paused = state.timer?.pausedAt !== null && state.timer !== null;
  const hidden = usePageHidden();
  const [now, setNow] = useState(() => Date.now());

  // Wall-clock ticks drive the elapsed display; the engine keeps lastNow for the result.
  useEffect(() => {
    if (!inLock || paused) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      send({ type: "TICK", now: t });
    }, 1000);
    return () => clearInterval(id);
  }, [inLock, paused, send]);

  // Hidden tab pauses the clock; never auto-resumes (FR-CORE-05).
  useEffect(() => {
    if (hidden && inLock && !paused) send({ type: "PAUSE", now: Date.now() });
  }, [hidden, inLock, paused, send]);

  // Persist where they are at every lock boundary; clear it when the story ends.
  useEffect(() => {
    if (phase === "handoff" && state.viewer === "A") onProgress(progressOf(state));
    if (phase === "results") {
      onProgress(null);
      if (story) markSeen("G19", [story.id]);
    }
  }, [phase, state, story, onProgress]);

  if (!story) {
    return (
      <SessionFrame game={game}>
        <p role="status" className="text-danger">
          القصة غير متاحة.
        </p>
        <Button className="mt-4" onClick={onDone}>
          رجوع
        </Button>
      </SessionFrame>
    );
  }

  const elapsed = clock(elapsedMs(state, now));
  const clue = lock ? (state.viewer === "A" ? lock.clueA : lock.clueB) : "";
  const last = state.completedRounds[state.completedRounds.length - 1];

  return (
    <SessionFrame
      game={game}
      live={phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inLock ? { current: state.lock + 1, total: LOCKS } : undefined}
    >
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {phase === "card" ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="card-in flex flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold font-display text-2xl">{story.title}</h2>
              <FavoriteButton kind="card" id={story.id} />
            </div>
            <p className="text-lg leading-relaxed">{story.body}</p>
          </div>
          <p className="text-center text-ink-soft text-sm">
            يبدأ العدّ حين تضغطان «ابدأ». الوقت للمتعة فقط.
          </p>
          <Button
            fullWidth
            className="mt-auto"
            onClick={() => send({ type: "READY", now: Date.now() })}
          >
            ابدأ
          </Button>
        </div>
      ) : null}

      {inLock && paused ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-card bg-card p-8 text-center">
          <p role="status" className="font-semibold text-lg">
            توقّف الوقت مؤقّتاً
          </p>
          <p className="text-ink-soft">
            الوقت المنقضي: <Num value={elapsed} />
          </p>
          <Button fullWidth onClick={() => send({ type: "RESUME", now: Date.now() })}>
            متابعة
          </Button>
        </div>
      ) : null}

      {inLock && !paused && lock ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex items-center justify-between text-ink-soft text-sm">
            <span className="font-semibold">{lock.title}</span>
            <span>
              <span className="sr-only">الوقت المنقضي </span>
              <Num value={elapsed} />
            </span>
          </div>

          {phase === "handoff" ? (
            <Handoff toName={aliases[state.viewer]} onReady={() => send({ type: "READY" })} />
          ) : null}

          {phase === "private_view" ? (
            <>
              <div className="card-in flex min-h-44 flex-col gap-3 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
                <p className="font-semibold text-ink-soft">
                  دليلك الخاص يا {aliases[state.viewer]}
                </p>
                <p className="flex-1 font-display font-semibold text-2xl leading-snug">{clue}</p>
                <p className="text-ink-faint text-sm">
                  احفظه جيداً ولا تُرِ الشاشة لشريكك؛ ستتشاركان الدليلين بالكلام.
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <Button fullWidth onClick={() => send({ type: "NEXT" })}>
                  حفظته
                </Button>
                <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                  تخطّي هذا القفل
                </Button>
              </div>
            </>
          ) : null}

          {phase === "input" ? (
            <form
              className="flex flex-1 flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                send({ type: "DONE" });
              }}
            >
              <div className="card-in flex flex-col gap-3 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
                <p className="font-display font-semibold text-2xl leading-snug">{lock.question}</p>
                <p className="text-ink-soft text-sm">
                  تبادلا ما قرأه كلٌّ منكما بصوت عالٍ، ثم اكتبا الجواب معاً.
                </p>
                {state.hintShown ? (
                  <p role="status" className="rounded-xl bg-mint-soft p-3 text-sm">
                    <span className="font-semibold">تلميح: </span>
                    {lock.hint}
                  </p>
                ) : null}
              </div>
              <label className="flex flex-col gap-1 text-ink-soft text-sm">
                الجواب
                <input
                  type="text"
                  autoComplete="off"
                  value={state.attempt}
                  onChange={(e) => send({ type: "INPUT", field: "answer", value: e.target.value })}
                  className={INPUT}
                />
              </label>
              <p role="status" aria-live="polite" className="min-h-5 text-danger text-sm">
                {state.wrong ? "ليس هذا الجواب. راجعا الدليلين معاً." : ""}
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <Button type="submit" fullWidth disabled={state.attempt.trim() === ""}>
                  افتح القفل
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    disabled={state.hintShown}
                    onClick={() => send({ type: "HINT" })}
                  >
                    تلميح
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => send({ type: "REVEAL" })}
                  >
                    اكشف الحل
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => send({ type: "SKIP" })}
                >
                  تخطّي
                </Button>
              </div>
            </form>
          ) : null}

          {phase === "reveal" && last ? (
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-card bg-card p-5">
                <p
                  role="status"
                  className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
                    last.revealed ? "border-line bg-ground" : "border-mint bg-mint-soft"
                  }`}
                >
                  {last.revealed ? "الحل مكشوف" : "انفتح القفل!"}
                </p>
                <p>
                  <span className="text-ink-soft">الحل: </span>
                  <span className="font-semibold">{lock.solution}</span>
                </p>
                <p className="text-ink-soft">{lock.explanation}</p>
              </div>
              <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
                {state.lock + 1 >= LOCKS ? "إلى النهاية" : "القفل التالي"}
              </Button>
            </div>
          ) : null}
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
  state: G19State;
  onReplay: () => void;
}) {
  const r = G19.deriveResult(state);
  const story = state.deck[0];
  return (
    <ResultShell
      game={game}
      title={r.escaped ? "هربتما!" : "انتهت الجلسة"}
      note={r.escaped ? undefined : "انتهت الجلسة قبل النهاية؛ هذه خلاصة ما لعبتماه."}
      onReplay={onReplay}
    >
      {r.escaped && story ? <p className="mb-4 leading-relaxed">{story.ending}</p> : null}
      <Stats
        rows={[
          { label: "الوقت", value: <Num value={clock(r.elapsedMs)} /> },
          { label: "تلميحات", value: <Num value={r.hints} /> },
          { label: "حلول مكشوفة", value: <Num value={r.reveals} /> },
          {
            label: "أقفال مفتوحة",
            value: (
              <>
                <Num value={r.solved} /> من <Num value={LOCKS} />
              </>
            ),
          },
          { label: "أقفال متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
