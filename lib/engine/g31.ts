// G31 — A Gratitude Card (FR-G31). One starter per person (A then B), then «بطاقة أخرى» to keep
// going or «إنهاء» to stop. Nothing the players say is recorded: the result carries a count only.
import type { G31Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

/** One card per person. */
export const G31_ROUNDS = 2;
/** Upper bound for «بطاقة أخرى»; the session normally ends long before this. */
export const G31_MAX_CARDS = 8;

export type G31Setup = BaseSetup;
export interface G31State extends BaseState<G31Card> {
  reader: Player; // whose turn it is to read and complete the starter (A starts)
}
export interface G31Result {
  /** How many starters were read — never what was said (FR-G31: no content in the summary). */
  read: number;
}

const begin = (s: G31State, i: number): G31State => ({ ...s, roundIndex: i, phase: "card" });

export const G31: GameDefinition<G31Card, G31Setup, G31State, G31Result> = {
  id: "G31",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen, G31_MAX_CARDS),
  initialState: (deck, setup) => ({
    ...baseState<G31Card, RoundRecord>("G31", deck, withDefaultAliases(setup.aliases)),
    reader: "A",
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s); // «إنهاء» — always one tap away
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (s.phase !== "card") return s;
    const turn = { ...s, reader: other(s.reader) };
    if (e.type === "NEXT")
      return toRound(
        {
          ...turn,
          completedRounds: [
            ...s.completedRounds,
            { roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id },
          ],
        },
        s.roundIndex + 1,
        begin,
      );
    if (e.type === "SKIP") return skipRound(turn, begin);
    return s;
  },
  deriveResult: (s) => ({ read: s.completedRounds.length }),
};
