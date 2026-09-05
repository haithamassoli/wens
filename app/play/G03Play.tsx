"use client";

import { useState } from "react";
import { Handoff } from "@/components/play/Handoff";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G03_CARDS } from "@/lib/content";
import { type Aliases, activePlayer, G03, type G03Setup, other } from "@/lib/engine";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { ChoiceInput, ChoiceReveal, MatchResults } from "./ChoiceRound";
import { Instructions, RoundsPicker, SetupShell } from "./Setup";
import { useSession } from "./useSession";

/** Options are people, not button positions (FR-G03). */
const personOptions = (a: Aliases) => [
  { id: "PLAYER_A", label: a.A },
  { id: "PLAYER_B", label: a.B },
  { id: "BOTH", label: "كلانا" },
];

/** G03 — Which One of Us? The first submitter alternates each round. */
export function G03Play({ game }: { game: GameMeta }) {
  const [rounds, setRounds] = useState<5 | 10>(5);
  const [session, setSession] = useState<{ setup: G03Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G03.availableCount(G03_CARDS, { rounds })}
        requested={rounds}
        onStart={(aliases) => setSession({ setup: { rounds, aliases }, seen: readSeen(game.id) })}
      >
        <RoundsPicker value={rounds} onChange={setRounds} hue={game.hue} />
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G03Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G03, G03_CARDS, setup, seen);
  const { aliases, phase } = state;
  const card = state.deck[state.roundIndex];
  const active = activePlayer(phase);
  const last = state.completedRounds[state.completedRounds.length - 1];
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";
  const options = personOptions(aliases);
  const labelOf = (id: string) => options.find((o) => o.id === id)?.label ?? "";

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
          headline={`الدور على ${aliases[active]}`}
          cardId={card.id}
          body={card.body}
          options={options}
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

      {phase === "reveal" && card && last ? (
        <ChoiceReveal
          cardId={card.id}
          body={card.body}
          picks={[
            { id: "A", name: `اختيار ${aliases.A}`, label: labelOf(last.a) },
            { id: "B", name: `اختيار ${aliases.B}`, label: labelOf(last.b) },
          ]}
          badge={last.match ? { text: "تطابق!", match: true } : { text: "اختلفتما", match: false }}
          onNext={() => send({ type: "NEXT" })}
        />
      ) : null}

      {phase === "results" ? (
        <MatchResults game={game} result={G03.deriveResult(state)} onReplay={restart} />
      ) : null}
    </SessionFrame>
  );
}
