// G03 — Which One of Us? (FR-G03). Options are people, first submitter alternates per round.
import type { WhichOfUsCard } from "../content/types";
import {
  type ChoiceState,
  type MatchRound,
  makeChoiceGame,
  matchRecord,
  matchResult,
} from "./choice.ts";
import type { BaseSetup } from "./types.ts";

export const G03_OPTIONS = ["PLAYER_A", "PLAYER_B", "BOTH"] as const;
export type G03Option = (typeof G03_OPTIONS)[number];

export interface G03Setup extends BaseSetup {
  rounds: 5 | 10;
}
export type G03State = ChoiceState<WhichOfUsCard, MatchRound>;
export type { MatchResult as G03Result } from "./choice.ts";

export const G03 = makeChoiceGame<
  WhichOfUsCard,
  G03Setup,
  MatchRound,
  ReturnType<typeof matchResult>
>({
  id: "G03",
  rounds: (setup) => setup.rounds,
  firstPlayer: (i) => (i % 2 === 0 ? "A" : "B"),
  isValidOption: (_card, id) => (G03_OPTIONS as readonly string[]).includes(id),
  record: matchRecord,
  deriveResult: matchResult,
});
