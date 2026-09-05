// G10 — Silent Charades (FR-G10). Six turns, the actor alternates, 60 seconds each.
// The word is read in `private_view` only; the timer screen never receives it.
import type { G10Card } from "../content/types";
import { makePerformGame, type PerformResult, type PerformState } from "./perform.ts";
import type { BaseSetup } from "./types.ts";

/** Difficulty levels, stored as the card `category`. */
export type CharadeLevel = "easy" | "medium" | "hard";
export const G10_LEVELS: readonly CharadeLevel[] = ["easy", "medium", "hard"];

export interface G10Setup extends BaseSetup {
  levels: CharadeLevel[];
}
export type G10State = PerformState<G10Card>;
export type G10Result = PerformResult;

export const G10_ROUNDS = 6;
export const G10_SECONDS = 60;

export const G10 = makePerformGame<G10Card, G10Setup>({
  id: "G10",
  durationSeconds: G10_SECONDS,
  rounds: () => G10_ROUNDS,
  filter: (setup) => (card) => setup.levels.includes(card.category as CharadeLevel),
});
