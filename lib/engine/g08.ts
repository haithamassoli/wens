// G08 — Our World If… (FR-G08). Three scenarios; each premise stays fixed while its three
// follow-ups are answered one at a time (NEXT = «اتفقنا»). SKIP («بطاقة أخرى») replaces the whole
// group, never a single follow-up. Cooperative: no correct answer and no score.
import type { G08Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type G08Pack = "work" | "home" | "travel" | "fantasy";
export const G08_ROUNDS = 3;
export const G08_FOLLOW_UPS = 3;

export type G08Setup = BaseSetup;
export interface G08State extends BaseState<G08Card> {
  stepIndex: number; // 0..2 — which follow-up of the current premise is on screen
}
export interface G08Result {
  completed: number; // scenarios finished through all three follow-ups
  skipped: number;
}

const begin = (s: G08State, i: number): G08State => ({
  ...s,
  roundIndex: i,
  phase: "card",
  stepIndex: 0,
});

export const G08: GameDefinition<G08Card, G08Setup, G08State, G08Result> = {
  id: "G08",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen, G08_ROUNDS),
  initialState: (deck, setup) => ({
    ...baseState<G08Card, RoundRecord>("G08", deck, withDefaultAliases(setup.aliases)),
    stepIndex: 0,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (s.phase !== "card") return s;
    if (e.type === "NEXT") {
      // Within a scenario: advance one follow-up, keeping the premise on screen.
      if (s.stepIndex < G08_FOLLOW_UPS - 1) return { ...s, stepIndex: s.stepIndex + 1 };
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
    }
    // «بطاقة أخرى» — redrawing replaces the entire group, however far in they were.
    if (e.type === "SKIP") return skipRound(s, begin);
    return s;
  },
  deriveResult: (s) => ({ completed: s.completedRounds.length, skipped: s.skippedRounds.length }),
};
