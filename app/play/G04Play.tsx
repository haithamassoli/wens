"use client";

import { useState } from "react";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G04_CARDS } from "@/lib/content";
import {
  activePlayer,
  G04,
  G04_ROUNDS,
  type G04Result,
  type G04Setup,
  type G04State,
  roles,
} from "@/lib/engine";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { ChoiceInput, ChoiceReveal } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

/** G04 — How Well Do You Know Me? (FR-G04). Fixed 10 rounds; the answerer alternates. */
export function G04Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{ setup: G04Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G04.availableCount(G04_CARDS, {})}
        requested={G04_ROUNDS}
        onStart={(aliases) => setSession({ setup: { aliases }, seen: readSeen(game.id) })}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          <Num value={G04_ROUNDS} /> جولات ثابتة: <Num value={G04_ROUNDS / 2} /> فرص لكلٍّ منكما
          للتوقّع.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function ScoreLine({ state }: { state: G04State }) {
  const { points } = G04.deriveResult(state);
  return (
    <p>
      {state.aliases.A} <Num value={points.A} /> – {state.aliases.B} <Num value={points.B} />
    </p>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G04Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G04, G04_CARDS, setup, seen);
  const { aliases, phase } = state;
  const card = state.deck[state.roundIndex];
  const active = activePlayer(phase);
  const { answerer, predictor } = roles(state);
  const last = state.completedRounds[state.completedRounds.length - 1];
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";
  const labelOf = (id: string) => card?.options.find((o) => o.id === id)?.label ?? "";

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

      {active && card ? (
        <ChoiceInput
          headline={
            active === answerer
              ? `${aliases[answerer]}: أجب عن نفسك`
              : `${aliases[predictor]}: ما الذي اختاره ${aliases[answerer]}؟`
          }
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
        <Handoff toName={aliases[predictor]} onReady={() => send({ type: "READY" })} />
      ) : null}

      {phase === "reveal" && card && last ? (
        <ChoiceReveal
          cardId={card.id}
          body={card.body}
          picks={[
            {
              id: "answer",
              name: `إجابة ${aliases[last.answerer]}`,
              label: labelOf(last.reference),
            },
            {
              id: "prediction",
              name: `توقّع ${aliases[predictor]}`,
              label: labelOf(last.prediction),
            },
          ]}
          badge={
            last.correct ? { text: "توقّع صحيح", match: true } : { text: "توقّع مختلف", match: false }
          }
          extra={<ScoreLine state={state} />}
          onNext={() => send({ type: "NEXT" })}
        />
      ) : null}

      {phase === "results" ? (
        <Results game={game} state={state} result={G04.deriveResult(state)} onReplay={restart} />
      ) : null}
    </SessionFrame>
  );
}

function Results({
  game,
  state,
  result: r,
  onReplay,
}: {
  game: GameMeta;
  state: G04State;
  result: G04Result;
  onReplay: () => void;
}) {
  const { aliases, endedEarly } = state;
  const verdict =
    r.winner === null ? null : r.winner === "tie" ? "تعادل" : `الأكثر توقّعاً: ${aliases[r.winner]}`;
  return (
    <ResultShell
      game={game}
      title={endedEarly ? "جلسة غير مكتملة" : "انتهت الجلسة"}
      note={
        r.completed === 0
          ? "لم تُكتمل أي جولة بعد."
          : endedEarly
            ? "خلاصة الجولات المكتملة فقط، بلا فائز."
            : undefined
      }
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: `نقاط ${aliases.A}`, value: <Num value={r.points.A} /> },
          { label: `نقاط ${aliases.B}`, value: <Num value={r.points.B} /> },
          ...(r.opportunities.A === r.opportunities.B
            ? [{ label: "فرص كل لاعب", value: <Num value={r.opportunities.A} /> }]
            : [
                { label: `فرص ${aliases.A}`, value: <Num value={r.opportunities.A} /> },
                { label: `فرص ${aliases.B}`, value: <Num value={r.opportunities.B} /> },
              ]),
          { label: "جولات مكتملة", value: <Num value={r.completed} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
      {verdict ? (
        <p role="status" className="mt-4 font-bold font-display text-2xl">
          {verdict}
        </p>
      ) : null}
    </ResultShell>
  );
}
