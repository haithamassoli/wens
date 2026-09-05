// G04 — How Well Do You Know Me? (FR-G04). 10 rounds; the answerer (state.firstPlayer) goes first,
// the other player predicts. Round 0,2,4… A answers; 1,3,5… B answers. Point to a correct predictor.
import type { PredictionCard } from "../content/types";
import { type ChoiceState, makeChoiceGame } from "./choice.ts";
import type { BaseSetup, Player, RoundRecord } from "./types.ts";
import { other } from "./types.ts";

export type G04Setup = BaseSetup;
export interface G04Round extends RoundRecord {
  answerer: Player;
  reference: string;
  prediction: string;
  correct: boolean;
}
export type G04State = ChoiceState<PredictionCard, G04Round>;
export interface G04Result {
  points: Record<Player, number>;
  completed: number;
  skipped: number;
  opportunities: Record<Player, number>; // prediction slots per player, skipped included
  complete: boolean; // every slot consumed
  winner: Player | "tie" | null; // null while incomplete / ended early
}

export const G04_ROUNDS = 10;
const answererFor = (i: number): Player => (i % 2 === 0 ? "A" : "B");

/** Roles for the current round. */
export const roles = (s: G04State) => ({
  answerer: s.firstPlayer,
  predictor: other(s.firstPlayer),
});

export const G04 = makeChoiceGame<PredictionCard, G04Setup, G04Round, G04Result>({
  id: "G04",
  rounds: () => G04_ROUNDS,
  firstPlayer: answererFor,
  isValidOption: (card, id) => card.options.some((o) => o.id === id),
  record: (roundIndex, card, answerer, inputs) => ({
    roundIndex,
    cardId: card.id,
    answerer,
    reference: inputs[answerer],
    prediction: inputs[other(answerer)],
    correct: inputs.A === inputs.B,
  }),
  deriveResult(s) {
    const points: Record<Player, number> = { A: 0, B: 0 };
    for (const r of s.completedRounds) if (r.correct) points[other(r.answerer)]++;
    const n = s.deck.length;
    const opportunities: Record<Player, number> = { A: 0, B: 0 };
    for (let i = 0; i < n; i++) opportunities[other(answererFor(i))]++;
    const completed = s.completedRounds.length;
    const skipped = s.skippedRounds.length;
    const complete = n > 0 && completed + skipped === n;
    const winner = !complete ? null : points.A > points.B ? "A" : points.B > points.A ? "B" : "tie";
    return { points, completed, skipped, opportunities, complete, winner };
  },
});
