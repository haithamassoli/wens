// G02 — Would You Rather? (FR-G02). A always chooses first.
import type { ChoiceCard } from "../content/types";
import {
  type ChoiceState,
  type MatchRound,
  makeChoiceGame,
  matchRecord,
  matchResult,
} from "./choice.ts";
import type { BaseSetup } from "./types.ts";

export interface G02Setup extends BaseSetup {
  rounds: 5 | 10;
}
export type G02State = ChoiceState<ChoiceCard, MatchRound>;
export type { MatchResult as G02Result } from "./choice.ts";

export const G02 = makeChoiceGame<ChoiceCard, G02Setup, MatchRound, ReturnType<typeof matchResult>>(
  {
    id: "G02",
    rounds: (setup) => setup.rounds,
    firstPlayer: () => "A",
    isValidOption: (card, id) => card.options.some((o) => o.id === id),
    record: matchRecord,
    deriveResult: matchResult,
  },
);
