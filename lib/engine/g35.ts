// G35 — Religious Knowledge Quiz (FR-G35). Five questions from the chosen topics, players
// alternate: input (answerer picks: SUBMIT, then LOCK) → reveal (answer + explanation + source)
// → NEXT … → results. One point per correct answer, inside the game only.
import type { G35Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type G35Category = "seerah" | "quran" | "ethics";
export const G35_CATEGORIES: G35Category[] = ["seerah", "quran", "ethics"];
export const G35_ROUNDS = 5;

export interface G35Setup extends BaseSetup {
  categories: G35Category[];
}
export interface G35Round extends RoundRecord {
  answerer: Player;
  choice: string;
  correct: boolean;
}
export interface G35State extends BaseState<G35Card, G35Round> {
  choice: string | null;
}
export interface G35Result {
  points: Record<Player, number>;
  completed: number;
  skipped: number;
}

export const answerer = (roundIndex: number): Player => (roundIndex % 2 === 0 ? "A" : "B");

const inTopics = (setup: G35Setup) => (c: G35Card) =>
  setup.categories.includes(c.category as G35Category);
const begin = (s: G35State, i: number): G35State => ({
  ...s,
  roundIndex: i,
  phase: "input",
  choice: null,
});

export const G35: GameDefinition<G35Card, G35Setup, G35State, G35Result> = {
  id: "G35",
  availableCount: (cards, setup) => availableCount(cards, inTopics(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, inTopics(setup), seen, G35_ROUNDS),
  initialState: (deck, setup) => ({
    ...baseState<G35Card, G35Round>("G35", deck, withDefaultAliases(setup.aliases)),
    choice: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    const card = s.deck[s.roundIndex];
    if (!card) return s;
    if (s.phase === "input") {
      switch (e.type) {
        case "SUBMIT":
          return e.player === answerer(s.roundIndex) &&
            card.options.some((o) => o.id === e.optionId) &&
            e.optionId !== s.choice
            ? { ...s, choice: e.optionId }
            : s;
        case "LOCK": {
          if (s.choice === null || e.player !== answerer(s.roundIndex)) return s;
          const rec: G35Round = {
            roundIndex: s.roundIndex,
            cardId: card.id,
            answerer: answerer(s.roundIndex),
            choice: s.choice,
            correct: s.choice === card.answer,
          };
          return { ...s, phase: "reveal", completedRounds: [...s.completedRounds, rec] };
        }
        case "SKIP":
          return skipRound(s, begin);
        default:
          return s;
      }
    }
    if (s.phase === "reveal" && e.type === "NEXT") return toRound(s, s.roundIndex + 1, begin);
    return s;
  },
  deriveResult: (s) => ({
    points: {
      A: s.completedRounds.filter((r) => r.answerer === "A" && r.correct).length,
      B: s.completedRounds.filter((r) => r.answerer === "B" && r.correct).length,
    },
    completed: s.completedRounds.length,
    skipped: s.skippedRounds.length,
  }),
};
