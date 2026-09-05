// G33 — Learn Together (FR-G33). One lesson per session:
// instructions → START → card (lesson) → NEXT → playing (exercise) → DONE → input (question)
// → SUBMIT/LOCK → reveal (answer + explanation) → NEXT → results. SKIP moves on, never penalised.
import type { G33Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck } from "./util.ts";

export interface G33Setup extends BaseSetup {
  lessonId: string;
}
export interface G33Round extends RoundRecord {
  exerciseDone: boolean;
  answered: boolean;
  correct: boolean;
}
export interface G33State extends BaseState<G33Card, G33Round> {
  exerciseDone: boolean;
  choice: string | null;
}
export interface G33Result {
  lessonId: string | null;
  exerciseDone: boolean;
  answered: boolean;
  correct: boolean;
}

/** Persisted progress helper: adding a lesson twice keeps the list intact (idempotent). */
export const withDone = (done: string[], id: string): string[] =>
  done.includes(id) ? done : [...done, id];

const finish = (s: G33State, answered: boolean, correct: boolean): G33State => ({
  ...s,
  phase: "reveal",
  completedRounds: [
    { roundIndex: 0, cardId: s.deck[0].id, exerciseDone: s.exerciseDone, answered, correct },
  ],
});

export const G33: GameDefinition<G33Card, G33Setup, G33State, G33Result> = {
  id: "G33",
  availableCount: (cards, setup) => availableCount(cards, (c) => c.id === setup.lessonId),
  buildDeck: (cards, setup, seen) => pickDeck(cards, (c) => c.id === setup.lessonId, seen, 1),
  initialState: (deck, setup) => ({
    ...baseState<G33Card, G33Round>("G33", deck, withDefaultAliases(setup.aliases)),
    exerciseDone: false,
    choice: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    const card = s.deck[0];
    if (!card) return s;
    switch (s.phase) {
      case "instructions":
        return e.type === "START" ? { ...s, phase: "card" } : s;
      case "card":
        return e.type === "NEXT" || e.type === "SKIP" ? { ...s, phase: "playing" } : s;
      case "playing":
        if (e.type === "DONE") return { ...s, phase: "input", exerciseDone: true };
        if (e.type === "SKIP") return { ...s, phase: "input" };
        return s;
      case "input":
        if (e.type === "SUBMIT")
          return card.question.options.some((o) => o.id === e.optionId) && e.optionId !== s.choice
            ? { ...s, choice: e.optionId }
            : s;
        if (e.type === "LOCK")
          return s.choice === null ? s : finish(s, true, s.choice === card.question.answer);
        if (e.type === "SKIP") return finish(s, false, false);
        return s;
      case "reveal":
        return e.type === "NEXT" ? { ...s, phase: "results", ended: true } : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => {
    const r = s.completedRounds[0];
    return {
      lessonId: s.deck[0]?.id ?? null,
      exerciseDone: r?.exerciseDone ?? s.exerciseDone,
      answered: r?.answered ?? false,
      correct: r?.correct ?? false,
    };
  },
};
