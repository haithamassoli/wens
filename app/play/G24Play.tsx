"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G24_CARDS } from "@/lib/content";
import { activePlayer } from "@/lib/engine/choice";
import { G24, type G24Setup, puzzleForDate } from "@/lib/engine/g24";
import { other } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { readSeen, useGameData } from "@/lib/storage";
import { ChoiceInput } from "./ChoiceRound";
import { Instructions, SetupShell } from "./Setup";
import { useSession } from "./useSession";

const CATEGORY: Record<string, string> = {
  logic: "منطق",
  numbers: "أعداد",
  words: "كلمات",
  riddle: "أحجية",
};

/** The device's own calendar date, "YYYY-MM-DD" — never a UTC day. */
function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * G24 — Daily Duo Puzzle (FR-G24). The date decides the puzzle, so both players (and both
 * time zones of the same device) always see the same one, and the day is credited only once.
 * ponytail: completion lives in localStorage; a shared history would need a synced backend.
 */
export function G24Play({ game }: { game: GameMeta }) {
  const [today, setToday] = useState<string | null>(null);
  const [done, setDone, hydrated] = useGameData("G24", { days: [] as string[] });
  const [session, setSession] = useState<{ setup: G24Setup; seen: string[] } | null>(null);

  useEffect(() => setToday(localDate()), []);

  const markToday = () => {
    if (!today) return;
    setDone((d) => (d.days.includes(today) ? d : { days: [...d.days, today].slice(-400) }));
  };

  if (session) return <Session game={game} {...session} onSolved={markToday} />;

  const alreadyDone = hydrated && today !== null && done.days.includes(today);
  const puzzle = today ? puzzleForDate(G24_CARDS, today) : undefined;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G24.availableCount(G24_CARDS, { date: today ?? "" })}
        requested={1}
        onStart={(aliases) =>
          setSession({
            setup: { date: today ?? localDate(), aliases },
            seen: readSeen(game.id),
          })
        }
      >
        {alreadyDone ? (
          <p
            role="status"
            className="rounded-card border border-mint bg-mint-soft p-4 font-semibold"
          >
            أُنجز لغز اليوم. يمكنكما مراجعته متى شئتما.
          </p>
        ) : null}
        {puzzle && CATEGORY[puzzle.category] ? (
          <p className="text-ink-soft">
            لغز اليوم من نوع: <Tag hue={game.hue}>{CATEGORY[puzzle.category]}</Tag>
          </p>
        ) : null}
      </SetupShell>
    </SessionFrame>
  );
}

function Session({
  game,
  setup,
  seen,
  onSolved,
}: {
  game: GameMeta;
  setup: G24Setup;
  seen: string[];
  onSolved: () => void;
}) {
  const { state, send, restart } = useSession(G24, G24_CARDS, setup, seen);
  const { aliases, phase } = state;
  const card = state.deck[state.roundIndex] ?? state.deck[0];
  const active = activePlayer(phase);
  const result = G24.deriveResult(state);
  const labelOf = (id: string | null) => card?.options.find((o) => o.id === id)?.label ?? "";

  // Recorded once, for the local date only — never twice, and never with a score.
  const recorded = useRef(false);
  useEffect(() => {
    if (result.completed && !recorded.current) {
      recorded.current = true;
      onSolved();
    }
  }, [result.completed, onSolved]);

  return (
    <SessionFrame game={game} live={phase !== "results"} onExit={() => send({ type: "END" })}>
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {active && card ? (
        <ChoiceInput
          headline={`اقتراح ${aliases[active]} (سرّي)`}
          cardId={card.id}
          body={card.body}
          options={card.options}
          selected={state.currentInputs[active]}
          hue={game.hue}
          onSelect={(optionId) => send({ type: "SUBMIT", player: active, optionId })}
          onLock={() => send({ type: "LOCK", player: active })}
          onSkip={() => send({ type: "SKIP" })}
        />
      ) : null}

      {phase === "handoff" ? (
        <Handoff
          toName={aliases[other(state.firstPlayer)]}
          onReady={() => send({ type: "READY" })}
        />
      ) : null}

      {phase === "reveal" && card ? (
        <div className="flex flex-1 flex-col gap-5">
          <article className="rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
            <p className="font-display font-semibold text-xl leading-snug">{card.body}</p>
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-chip border border-mint bg-mint-soft px-4 py-1.5 font-bold"
            >
              الجواب: {labelOf(card.answer)}
            </p>
            <p className="mt-3 text-ink-soft leading-relaxed">{card.explanation}</p>
          </article>
          <dl className="flex flex-col gap-2 rounded-card bg-card p-5">
            {(["A", "B"] as const).map((p) => {
              const pick = p === "A" ? result.a : result.b;
              const ok = p === "A" ? result.aCorrect : result.bCorrect;
              return (
                <div key={p} className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-soft">{aliases[p]}</dt>
                  <dd className="text-end font-semibold">
                    {labelOf(pick)}{" "}
                    <span className="text-ink-soft">— {ok ? "أصاب" : "لم يصب"}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
            تمّ
          </Button>
        </div>
      ) : null}

      {phase === "results" ? (
        <ResultShell
          game={game}
          title={result.completed ? "أُنجز لغز اليوم" : "لم يُحلّ لغز اليوم بعد."}
          note={
            result.completed ? "يعود اللغز جديداً مع كل يوم، ولا شيء يُفقد إن فاتكما يوم." : undefined
          }
          onReplay={restart}
        >
          {card ? (
            <div className="flex flex-col gap-3">
              <p className="font-semibold">{card.body}</p>
              <p className="text-ink-soft">
                الجواب: {labelOf(card.answer)} — {card.explanation}
              </p>
            </div>
          ) : null}
        </ResultShell>
      ) : null}
    </SessionFrame>
  );
}
