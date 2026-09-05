// Placeholder engine for games not yet implemented: a card-only loop (like G01) over BaseCard.
// ponytail: replaced per game by lib/engine/<id>.ts; delete this file when no stub remains.
import type { BaseCard, GameId } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type StubState = BaseState<BaseCard, RoundRecord>;
const begin = (s: StubState, i: number): StubState => ({ ...s, roundIndex: i, phase: "card" });

export function stubGame(
  id: GameId,
): GameDefinition<BaseCard, BaseSetup, StubState, { completed: number; skipped: number }> {
  return {
    id,
    availableCount: (cards) => availableCount(cards, () => true),
    buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen),
    initialState: (deck, setup) => baseState(id, deck, withDefaultAliases(setup.aliases)),
    reduce(s, e) {
      if (s.ended) return s;
      if (e.type === "END") return endEarly(s);
      if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
      if (s.phase !== "card") return s;
      if (e.type === "NEXT")
        return toRound(
          {
            ...s,
            completedRounds: [
              ...s.completedRounds,
              { roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id },
            ],
          },
          s.roundIndex + 1,
          begin,
        );
      if (e.type === "SKIP") return skipRound(s, begin);
      return s;
    },
    deriveResult: (s) => ({ completed: s.completedRounds.length, skipped: s.skippedRounds.length }),
  };
}
