// G14 — The Preference Auction. 100 stars each (no monetary value), 5 secret-bid rounds.
// player_A_input → LOCK A → handoff → READY → player_B_input → LOCK B → reveal → NEXT.
// Balances are engine state; the deduction happens once, at the second LOCK, and a repeated
// LOCK in `reveal` is rejected (same reference). Bids are cleared when the round ends (NEXT/SKIP).
import type { G14Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Phase, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export const G14_ROUNDS = 5;
export const G14_STARS = 100;

export type G14Setup = BaseSetup;
export interface G14Round extends RoundRecord {
  winner: Player | "shared";
  price: number; // stars paid by the winner; 0 when shared
}
export interface G14State extends BaseState<G14Card, G14Round> {
  balances: Record<Player, number>;
  bids: Record<Player, number | null>; // secret until reveal; never rendered for the other player
}
export interface G14Result {
  won: Record<Player, string[]>; // card ids won per player
  shared: string[];
  stars: Record<Player, number>; // remaining, recomputed from completedRounds
  completed: number;
  skipped: number;
}

const inputPhase = (p: Player): Phase => `player_${p}_input`;
/** Player whose bid the current phase waits for, if any. */
export const bidder = (phase: Phase): Player | null =>
  phase === "player_A_input" ? "A" : phase === "player_B_input" ? "B" : null;

const begin = (s: G14State, i: number): G14State => ({
  ...s,
  roundIndex: i,
  phase: inputPhase("A"),
  bids: { A: null, B: null },
});

export const G14: GameDefinition<G14Card, G14Setup, G14State, G14Result> = {
  id: "G14",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen, G14_ROUNDS),
  initialState: (deck, setup) => ({
    ...baseState<G14Card, G14Round>("G14", deck, withDefaultAliases(setup.aliases)),
    balances: { A: G14_STARS, B: G14_STARS },
    bids: { A: null, B: null },
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    const active = bidder(s.phase);
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? toRound(s, 0, begin) : s;
      case "SET": {
        if (!active || e.key !== "bid" || typeof e.value !== "number") return s;
        const bid = e.value;
        if (!Number.isInteger(bid) || bid < 0 || bid > s.balances[active]) return s;
        return s.bids[active] === bid ? s : { ...s, bids: { ...s.bids, [active]: bid } };
      }
      case "LOCK": {
        if (active !== e.player) return s;
        const bid = s.bids[active];
        if (bid === null) return s;
        if (active === "A") return { ...s, phase: "handoff" };
        const a = s.bids.A ?? 0; // A locked earlier
        const winner: G14Round["winner"] = a === bid ? "shared" : a > bid ? "A" : "B";
        const price = winner === "shared" ? 0 : winner === "A" ? a : bid;
        const rec: G14Round = {
          roundIndex: s.roundIndex,
          cardId: s.deck[s.roundIndex].id,
          winner,
          price,
        };
        return {
          ...s,
          phase: "reveal",
          completedRounds: [...s.completedRounds, rec],
          balances:
            winner === "shared"
              ? s.balances
              : { ...s.balances, [winner]: s.balances[winner] - price },
        };
      }
      case "READY":
        return s.phase === "handoff" ? { ...s, phase: inputPhase("B") } : s;
      case "NEXT":
        return s.phase === "reveal" ? toRound(s, s.roundIndex + 1, begin) : s;
      case "SKIP":
        return active || s.phase === "handoff" ? skipRound(s, begin) : s;
      default:
        return s;
    }
  },
  deriveResult(s) {
    const won: G14Result["won"] = { A: [], B: [] };
    const shared: string[] = [];
    const stars = { A: G14_STARS, B: G14_STARS };
    for (const r of s.completedRounds) {
      if (r.winner === "shared") shared.push(r.cardId);
      else {
        won[r.winner].push(r.cardId);
        stars[r.winner] -= r.price;
      }
    }
    return {
      won,
      shared,
      stars,
      completed: s.completedRounds.length,
      skipped: s.skippedRounds.length,
    };
  },
};
