// G23 — Rank It Like Me (FR-G23). Ranker alternates A/B. Orders are permutations of the card's items.
// player_<ranker>_input (SET order → LOCK) → handoff → player_<predictor>_input → reveal → NEXT.
// 1 point per item in the correct position (0–4) to the predictor.
import type { G23Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Phase, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface G23Setup extends BaseSetup {
  rounds: 4 | 6;
}
export interface G23Round extends RoundRecord {
  ranker: Player;
  order: string[];
  prediction: string[];
  points: number;
}
export interface G23State extends BaseState<G23Card, G23Round> {
  ranker: Player;
  orders: Record<Player, string[]>; // item ids; the predictor never sees the ranker's
}
export interface G23Result {
  points: Record<Player, number>;
  possible: Record<Player, number>; // 4 × prediction slots per player, skipped included
  completed: number;
  skipped: number;
  complete: boolean;
  winner: Player | "tie" | null;
}

export const G23_ITEMS = 4;
const rankerFor = (i: number): Player => (i % 2 === 0 ? "A" : "B");
const inputPhase = (p: Player): Phase => `player_${p}_input`;

/** Every item exactly once. */
export const isPermutation = (card: G23Card, order: readonly string[]) =>
  order.length === card.items.length &&
  new Set(order).size === order.length &&
  card.items.every((o) => order.includes(o.id));

export const positionsMatched = (a: readonly string[], b: readonly string[]) =>
  a.filter((id, i) => id === b[i]).length;

/** Move the item at `index` one step up (-1) or down (+1); returns the same array when impossible. */
export function moveItem(order: readonly string[], index: number, delta: -1 | 1): string[] {
  const j = index + delta;
  if (index < 0 || index >= order.length || j < 0 || j >= order.length) return order as string[];
  const next = order.slice();
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

const begin = (s: G23State, i: number): G23State => {
  const ids = s.deck[i].items.map((o) => o.id);
  return {
    ...s,
    roundIndex: i,
    ranker: rankerFor(i),
    orders: { A: ids, B: ids },
    phase: inputPhase(rankerFor(i)),
  };
};

export const G23: GameDefinition<G23Card, G23Setup, G23State, G23Result> = {
  id: "G23",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, setup, seen) => pickDeck(cards, () => true, seen, setup.rounds),
  initialState: (deck, setup) => ({
    ...baseState<G23Card, G23Round>("G23", deck, withDefaultAliases(setup.aliases)),
    ranker: "A",
    orders: { A: [], B: [] },
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    const card = s.deck[s.roundIndex];
    const predictor = other(s.ranker);
    const active =
      s.phase === inputPhase(s.ranker)
        ? s.ranker
        : s.phase === inputPhase(predictor)
          ? predictor
          : null;
    switch (e.type) {
      case "SET":
        return active && e.key === "order" && Array.isArray(e.value) && isPermutation(card, e.value)
          ? { ...s, orders: { ...s.orders, [active]: e.value } }
          : s;
      case "LOCK": {
        if (!active || e.player !== active) return s;
        if (active === s.ranker) return { ...s, phase: "handoff" };
        const rec: G23Round = {
          roundIndex: s.roundIndex,
          cardId: card.id,
          ranker: s.ranker,
          order: s.orders[s.ranker],
          prediction: s.orders[predictor],
          points: positionsMatched(s.orders[s.ranker], s.orders[predictor]),
        };
        return { ...s, phase: "reveal", completedRounds: [...s.completedRounds, rec] };
      }
      case "READY":
        return s.phase === "handoff" ? { ...s, phase: inputPhase(predictor) } : s;
      case "NEXT":
        return s.phase === "reveal" ? toRound(s, s.roundIndex + 1, begin) : s;
      case "SKIP":
        return active || s.phase === "handoff" ? skipRound(s, begin) : s;
      default:
        return s;
    }
  },
  deriveResult(s) {
    const points: Record<Player, number> = { A: 0, B: 0 };
    for (const r of s.completedRounds) points[other(r.ranker)] += r.points;
    const possible: Record<Player, number> = { A: 0, B: 0 };
    for (let i = 0; i < s.deck.length; i++) possible[other(rankerFor(i))] += G23_ITEMS;
    const completed = s.completedRounds.length;
    const skipped = s.skippedRounds.length;
    const complete = s.deck.length > 0 && completed + skipped === s.deck.length;
    const winner = !complete ? null : points.A > points.B ? "A" : points.B > points.A ? "B" : "tie";
    return { points, possible, completed, skipped, complete, winner };
  },
};
