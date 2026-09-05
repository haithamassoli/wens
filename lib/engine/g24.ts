// G24 — Daily Duo Puzzle (FR-G24). One puzzle per local calendar day, the same for both players.
// Secret-choice flow (like G02): player_A_input → handoff → player_B_input → reveal.
// The bank is walked by day index, so the same date always yields the same puzzle and changing
// time zone can never hand out a second one.
import type { G24Card } from "../content/types";
import type { ChoiceState } from "./choice.ts";
import { makeChoiceGame } from "./choice.ts";
import type { GameDefinition, RoundRecord } from "./types.ts";

export interface G24Setup {
  aliases?: Partial<{ A: string; B: string }>;
  /** The device's local calendar date, "YYYY-MM-DD" (injected so it can be tested). */
  date: string;
}

export interface G24Round extends RoundRecord {
  a: string;
  b: string;
  answer: string;
}

export interface G24Result {
  answer: string | null;
  a: string | null;
  b: string | null;
  aCorrect: boolean;
  bCorrect: boolean;
  completed: boolean;
}

export type G24State = ChoiceState<G24Card, G24Round>;

/** Whole days between the Unix epoch and a local "YYYY-MM-DD" (no time zone arithmetic). */
export function daysSinceEpoch(localDate: string): number {
  const [y, m, d] = localDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The bank in stable id order, so every device agrees on today's puzzle. */
export const puzzleBank = (cards: G24Card[]): G24Card[] =>
  cards.filter((c) => c.status === "published").sort((a, b) => a.id.localeCompare(b.id));

export function puzzleForDate(cards: G24Card[], localDate: string): G24Card | undefined {
  const bank = puzzleBank(cards);
  if (bank.length === 0) return undefined;
  const n = bank.length;
  return bank[((daysSinceEpoch(localDate) % n) + n) % n];
}

const base = makeChoiceGame<G24Card, G24Setup, G24Round, G24Result>({
  id: "G24",
  rounds: () => 1,
  firstPlayer: () => "A",
  isValidOption: (card, optionId) => card.options.some((o) => o.id === optionId),
  record: (roundIndex, card, _first, inputs) => ({
    roundIndex,
    cardId: card.id,
    a: inputs.A,
    b: inputs.B,
    answer: card.answer,
  }),
  deriveResult: (s) => {
    const r = s.completedRounds[0];
    if (!r)
      return { answer: null, a: null, b: null, aCorrect: false, bCorrect: false, completed: false };
    return {
      answer: r.answer,
      a: r.a,
      b: r.b,
      aCorrect: r.a === r.answer,
      bCorrect: r.b === r.answer,
      completed: true,
    };
  },
});

export const G24: GameDefinition<G24Card, G24Setup, G24State, G24Result> = {
  ...base,
  availableCount: (cards) => (puzzleBank(cards).length > 0 ? 1 : 0),
  /** Exactly today's puzzle; `seen` is irrelevant — the date decides. */
  buildDeck: (cards, setup) => {
    const card = puzzleForDate(cards, setup.date);
    return card ? [card] : [];
  },
};
