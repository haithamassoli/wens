// G06 — Memory Lane (FR-G06). Five cards from the chosen theme packs: instructions → card … → results.
// Memory titles are NOT part of engine state: the play screen saves them explicitly via useGameData,
// so nothing is kept when the players cancel the input (FR-G06 acceptance).
import type { G06Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type G06Pack = "beginnings" | "travel" | "home" | "funny";
export const G06_PACKS: readonly G06Pack[] = ["beginnings", "travel", "home", "funny"];
export const G06_ROUNDS = 5;

export interface G06Setup extends BaseSetup {
  packs: G06Pack[];
}
export type G06State = BaseState<G06Card>;
export interface G06Result {
  completed: number;
  skipped: number;
  cardIds: string[];
}

const inPack = (setup: G06Setup) => (c: G06Card) => setup.packs.includes(c.category as G06Pack);
const begin = (s: G06State, i: number): G06State => ({ ...s, roundIndex: i, phase: "card" });

export const G06: GameDefinition<G06Card, G06Setup, G06State, G06Result> = {
  id: "G06",
  availableCount: (cards, setup) => availableCount(cards, inPack(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, inPack(setup), seen, G06_ROUNDS),
  initialState: (deck, setup) =>
    baseState<G06Card, RoundRecord>("G06", deck, withDefaultAliases(setup.aliases)),
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
  // No accuracy score: two different accounts of the same memory are both fine (FR-G06 Result).
  deriveResult: (s) => ({
    completed: s.completedRounds.length,
    skipped: s.skippedRounds.length,
    cardIds: s.completedRounds.map((r) => r.cardId),
  }),
};
