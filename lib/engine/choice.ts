// Shared two-player secret-choice flow (G02, G03, G04):
// player_<first>_input → handoff → player_<second>_input → reveal → next round / results.
import type { BaseCard, GameId } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Phase, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface ChoiceState<Card, Round extends RoundRecord> extends BaseState<Card, Round> {
  currentInputs: Record<Player, string | null>; // cleared on NEXT/SKIP; never shown during handoff
  firstPlayer: Player; // who submits first this round (G04: the answerer)
}

export interface ChoiceConfig<Card extends BaseCard, Setup, Round extends RoundRecord, Result> {
  id: GameId;
  rounds(setup: Setup): number;
  firstPlayer(roundIndex: number): Player;
  isValidOption(card: Card, optionId: string): boolean;
  record(roundIndex: number, card: Card, first: Player, inputs: Record<Player, string>): Round;
  deriveResult(state: ChoiceState<Card, Round>): Result;
}

/** Player whose input the current phase is waiting for, if any. */
export const activePlayer = (phase: Phase): Player | null =>
  phase === "player_A_input" ? "A" : phase === "player_B_input" ? "B" : null;

const inputPhase = (p: Player): Phase => `player_${p}_input`;

export function makeChoiceGame<
  Card extends BaseCard,
  Setup extends BaseSetup,
  Round extends RoundRecord,
  Result,
>(
  cfg: ChoiceConfig<Card, Setup, Round, Result>,
): GameDefinition<Card, Setup, ChoiceState<Card, Round>, Result> {
  type S = ChoiceState<Card, Round>;
  const begin = (s: S, i: number): S => {
    const first = cfg.firstPlayer(i);
    return {
      ...s,
      roundIndex: i,
      firstPlayer: first,
      currentInputs: { A: null, B: null },
      phase: inputPhase(first),
    };
  };
  return {
    id: cfg.id,
    availableCount: (cards) => availableCount(cards, () => true),
    buildDeck: (cards, setup, seen) => pickDeck(cards, () => true, seen, cfg.rounds(setup)),
    initialState: (deck, setup) => ({
      ...baseState<Card, Round>(cfg.id, deck, withDefaultAliases(setup.aliases)),
      currentInputs: { A: null, B: null },
      firstPlayer: cfg.firstPlayer(0),
    }),
    reduce(s, e) {
      if (s.ended) return s;
      if (e.type === "END") return endEarly(s);
      const card = s.deck[s.roundIndex];
      switch (e.type) {
        case "START":
          return s.phase === "instructions" ? toRound(s, 0, begin) : s;
        case "SUBMIT":
          return s.phase === inputPhase(e.player) &&
            cfg.isValidOption(card, e.optionId) &&
            s.currentInputs[e.player] !== e.optionId
            ? { ...s, currentInputs: { ...s.currentInputs, [e.player]: e.optionId } }
            : s;
        case "LOCK": {
          if (s.phase !== inputPhase(e.player) || s.currentInputs[e.player] === null) return s;
          if (e.player === s.firstPlayer) return { ...s, phase: "handoff" };
          const inputs = s.currentInputs as Record<Player, string>; // first locked earlier
          const rec = cfg.record(s.roundIndex, card, s.firstPlayer, inputs);
          return { ...s, phase: "reveal", completedRounds: [...s.completedRounds, rec] };
        }
        case "READY":
          return s.phase === "handoff" ? { ...s, phase: inputPhase(other(s.firstPlayer)) } : s;
        case "NEXT":
          return s.phase === "reveal" ? toRound(s, s.roundIndex + 1, begin) : s;
        case "SKIP":
          return activePlayer(s.phase) || s.phase === "handoff" ? skipRound(s, begin) : s;
        default:
          return s;
      }
    },
    deriveResult: cfg.deriveResult,
  };
}

// ---- Shared G02/G03 round + result (DATA-06) ----
export interface MatchRound extends RoundRecord {
  a: string;
  b: string;
  match: boolean;
}
export interface MatchResult {
  rounds: number; // completed rounds (denominator)
  matches: number;
  skipped: number;
  matchPercent: number | null; // null when no round is complete
}
export const matchRecord = (
  roundIndex: number,
  card: BaseCard,
  _first: Player,
  inputs: Record<Player, string>,
): MatchRound => ({
  roundIndex,
  cardId: card.id,
  a: inputs.A,
  b: inputs.B,
  match: inputs.A === inputs.B,
});
export const matchResult = (s: ChoiceState<unknown, MatchRound>): MatchResult => {
  const rounds = s.completedRounds.length;
  const matches = s.completedRounds.filter((r) => r.match).length;
  return {
    rounds,
    matches,
    skipped: s.skippedRounds.length,
    matchPercent: rounds ? Math.round((100 * matches) / rounds) : null,
  };
};
