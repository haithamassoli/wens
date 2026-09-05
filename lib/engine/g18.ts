// G18 — Emoji Guessing (FR-G18). Cooperative: one emoji card, four options, discuss and lock.
// card → (DONE with a choice | REVEAL) → reveal → NEXT → next card.
// A point is scored only for a correct answer locked BEFORE the solution was revealed.
// HINT is free: it is remembered for the result but never changes the score.
import type { G18Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface G18Setup extends BaseSetup {
  rounds: 5 | 10;
}

export interface G18Round extends RoundRecord {
  chosen: string | null; // null when the pair asked for the solution without choosing
  correct: boolean; // chosen === card.answer (informational when revealed)
  revealed: boolean; // solution shown before locking → scores nothing
  hinted: boolean;
}

export interface G18State extends BaseState<G18Card, G18Round> {
  chosen: string | null;
  hinted: boolean;
}

export interface G18Result {
  solved: number; // scored rounds: correct AND not revealed
  missed: number;
  revealed: number;
  skipped: number;
  hints: number;
}

const begin = (s: G18State, i: number): G18State => ({
  ...s,
  roundIndex: i,
  phase: "card",
  chosen: null,
  hinted: false,
});

export const G18: GameDefinition<G18Card, G18Setup, G18State, G18Result> = {
  id: "G18",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, setup, seen) => pickDeck(cards, () => true, seen, setup.rounds),
  initialState: (deck, setup) => ({
    ...baseState<G18Card, G18Round>("G18", deck, withDefaultAliases(setup.aliases)),
    chosen: null,
    hinted: false,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (e.type === "NEXT") return s.phase === "reveal" ? toRound(s, s.roundIndex + 1, begin) : s;
    if (s.phase !== "card") return s;
    const card = s.deck[s.roundIndex];
    const close = (revealed: boolean): G18State => ({
      ...s,
      phase: "reveal",
      completedRounds: [
        ...s.completedRounds,
        {
          roundIndex: s.roundIndex,
          cardId: card.id,
          chosen: s.chosen,
          correct: s.chosen === card.answer,
          revealed,
          hinted: s.hinted,
        },
      ],
    });
    switch (e.type) {
      case "SUBMIT":
        return card.options.some((o) => o.id === e.optionId) && s.chosen !== e.optionId
          ? { ...s, chosen: e.optionId }
          : s;
      case "HINT":
        return s.hinted || card.hint === "" ? s : { ...s, hinted: true };
      case "DONE":
        return s.chosen === null ? s : close(false);
      case "REVEAL":
        return close(true);
      case "SKIP":
        return skipRound(s, begin);
      default:
        return s;
    }
  },
  deriveResult: (s) => ({
    solved: s.completedRounds.filter((r) => r.correct && !r.revealed).length,
    missed: s.completedRounds.filter((r) => !r.revealed && !r.correct).length,
    revealed: s.completedRounds.filter((r) => r.revealed).length,
    skipped: s.skippedRounds.length,
    hints: s.completedRounds.filter((r) => r.hinted).length,
  }),
};
