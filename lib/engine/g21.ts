// G21 — Twenty Questions (FR-G21). Two rounds by default, one secret word each, the chooser
// alternates. The word lives only in `deck[roundIndex].body`: it is read in `private_view`,
// hidden for the whole `playing` phase, and shown again only in `reveal` — the intentional reveal.
//   private_view → READY → playing (INPUT +1 / UNDO −1, clamped to 0…20) → CORRECT|WRONG → reveal.
import type { G21Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type G21Category = "home" | "kitchen" | "outdoors" | "food" | "animals" | "things";
export const G21_CATEGORIES: readonly G21Category[] = [
  "home",
  "kitchen",
  "outdoors",
  "food",
  "animals",
  "things",
];

export const G21_MAX_QUESTIONS = 20;
/** The counter field name carried by the generic INPUT event. */
export const G21_QUESTION_FIELD = "question";

export interface G21Setup extends BaseSetup {
  categories: G21Category[];
  rounds: 2 | 4;
}

export interface G21Round extends RoundRecord {
  chooser: Player;
  guessed: boolean;
  questions: number;
}

export interface G21State extends BaseState<G21Card, G21Round> {
  chooser: Player; // holds the secret word this round (A starts)
  questions: number; // 0…20, reset every round
}

export interface G21Result {
  completed: number;
  skipped: number;
  guessed: number;
  questions: number; // total asked across completed rounds
  averageQuestions: number | null; // null while no round is complete
}

const inCategory = (setup: G21Setup) => (c: G21Card) =>
  setup.categories.includes(c.category as G21Category);

const begin = (s: G21State, i: number): G21State => ({
  ...s,
  roundIndex: i,
  phase: "private_view",
  chooser: i % 2 === 0 ? "A" : "B",
  questions: 0,
});

const settle = (s: G21State, guessed: boolean): G21State =>
  s.phase === "playing"
    ? {
        ...s,
        phase: "reveal",
        completedRounds: [
          ...s.completedRounds,
          {
            roundIndex: s.roundIndex,
            cardId: s.deck[s.roundIndex].id,
            chooser: s.chooser,
            guessed,
            questions: s.questions,
          },
        ],
      }
    : s;

export const G21: GameDefinition<G21Card, G21Setup, G21State, G21Result> = {
  id: "G21",
  availableCount: (cards, setup) => availableCount(cards, inCategory(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, inCategory(setup), seen, setup.rounds),
  initialState: (deck, setup) => ({
    ...baseState<G21Card, G21Round>("G21", deck, withDefaultAliases(setup.aliases)),
    chooser: "A",
    questions: 0,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? toRound(s, 0, begin) : s;
      case "READY":
        return s.phase === "private_view" ? { ...s, phase: "playing" } : s;
      case "INPUT":
        // +1 question, never past 20.
        return s.phase === "playing" &&
          e.field === G21_QUESTION_FIELD &&
          s.questions < G21_MAX_QUESTIONS
          ? { ...s, questions: s.questions + 1 }
          : s;
      case "UNDO":
        // One step back, never below 0.
        return s.phase === "playing" && s.questions > 0 ? { ...s, questions: s.questions - 1 } : s;
      case "CORRECT":
        return settle(s, true);
      case "WRONG":
        return settle(s, false);
      case "NEXT":
        return s.phase === "reveal" ? toRound(s, s.roundIndex + 1, begin) : s;
      case "SKIP":
        return s.phase === "private_view" || s.phase === "playing" ? skipRound(s, begin) : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => {
    const completed = s.completedRounds.length;
    const questions = s.completedRounds.reduce((sum, r) => sum + r.questions, 0);
    return {
      completed,
      skipped: s.skippedRounds.length,
      guessed: s.completedRounds.filter((r) => r.guessed).length,
      questions,
      averageQuestions: completed ? Math.round((10 * questions) / completed) / 10 : null,
    };
  },
};
