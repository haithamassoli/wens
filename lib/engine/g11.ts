// G11 — Explain Without These Words (FR-G11). The explainer reads the target and its three
// forbidden words in `private_view` only; the 60-second timer screen shows neither.
// The skip reason the doc allows is UI-local (session memory) and never enters the engine.
import type { G11Card } from "../content/types";
import { makePerformGame, type PerformResult, type PerformState } from "./perform.ts";
import type { BaseSetup } from "./types.ts";

export interface G11Setup extends BaseSetup {
  rounds: 6 | 10;
}
export type G11State = PerformState<G11Card>;
export type G11Result = PerformResult;

export const G11_SECONDS = 60;

export const G11 = makePerformGame<G11Card, G11Setup>({
  id: "G11",
  durationSeconds: G11_SECONDS,
  rounds: (setup) => setup.rounds,
  filter: () => () => true,
});
