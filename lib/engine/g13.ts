// G13 — The Unusual Announcer (FR-G13). Four fixed rounds; each draws one product, one style and
// one audience, all frozen for the round. Exactly ONE of the three may be REPLACEd before the
// timer starts; the swap-in is dealt with the round so the reducer stays pure.
//   card → (REPLACE once) → READY → timer_running ⇄ timer_paused; TICK past zero → timer_expired
//   → DONE → review (the partner picks the best line, no text is stored) → NEXT.
import type { G13Card } from "../content/types";
import { remainingMs, type TimerState } from "./perform.ts";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type AdSlot = "product" | "style" | "audience";
export const G13_SLOTS: readonly AdSlot[] = ["product", "style", "audience"];

/** One round's three elements plus the pre-dealt alternative for each slot. */
export interface AdDraw {
  product: G13Card;
  style: G13Card;
  audience: G13Card;
  alt: Record<AdSlot, G13Card>;
}

export type G13Setup = BaseSetup;

export interface G13Round extends RoundRecord {
  announcer: Player;
  styleId: string;
  audienceId: string;
}

export interface G13State extends BaseState<AdDraw, G13Round> {
  announcer: Player;
  durationMs: number;
  replaced: AdSlot | null; // the one element swapped this round, if any
  timer: TimerState | null;
}

export interface G13Result {
  completed: number; // performances delivered — no ranking of who was funnier
  skipped: number;
  performances: Record<Player, number>;
}

export const G13_ROUNDS = 4;
export const G13_SECONDS = 30;
const DURATION_MS = G13_SECONDS * 1000;

const ACTIVE = new Set(["timer_running", "timer_paused", "timer_expired"]);
const isSlot = (v: string): v is AdSlot => (G13_SLOTS as readonly string[]).includes(v);
const inCategory = (c: AdSlot) => (card: G13Card) => card.category === c;

/** The three elements actually in play, with the round's replacement applied. */
export function drawn(s: G13State): Record<AdSlot, G13Card> | null {
  const d = s.deck[s.roundIndex];
  if (!d) return null;
  const base = { product: d.product, style: d.style, audience: d.audience };
  return s.replaced ? { ...base, [s.replaced]: d.alt[s.replaced] } : base;
}

const begin = (s: G13State, i: number): G13State => ({
  ...s,
  roundIndex: i,
  phase: "card",
  announcer: i % 2 === 0 ? "A" : "B",
  replaced: null,
  timer: null,
});

export const G13: GameDefinition<G13Card, G13Setup, G13State, G13Result> = {
  id: "G13",
  // The scarcest of the three piles is what limits the session.
  availableCount: (cards) =>
    Math.min(
      ...G13_SLOTS.map(
        (slot) => cards.filter((c) => c.status === "published" && c.category === slot).length,
      ),
    ),
  buildDeck(cards, _setup, seen) {
    const [products, styles, audiences] = G13_SLOTS.map((slot) =>
      pickDeck(cards, inCategory(slot), seen, 2 * G13_ROUNDS),
    );
    const rounds = Math.min(G13_ROUNDS, products.length, styles.length, audiences.length);
    // ponytail: one pre-dealt alternative per slot is enough because only one swap is allowed.
    const at = (pool: G13Card[], i: number) => pool[i % pool.length];
    return Array.from({ length: rounds }, (_, i) => ({
      product: products[i],
      style: styles[i],
      audience: audiences[i],
      alt: {
        product: at(products, i + rounds),
        style: at(styles, i + rounds),
        audience: at(audiences, i + rounds),
      },
    })) as unknown as G13Card[]; // the deck holds composed draws, not single cards
  },
  initialState: (deck, setup) => ({
    ...baseState<AdDraw, G13Round>(
      "G13",
      deck as unknown as AdDraw[],
      withDefaultAliases(setup.aliases),
    ),
    announcer: "A",
    durationMs: DURATION_MS,
    replaced: null,
    timer: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    const t = s.timer;
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? toRound(s, 0, begin) : s;
      case "REPLACE":
        // One swap per round, and only while the elements are still on the shared screen.
        return s.phase === "card" && s.replaced === null && isSlot(e.slot)
          ? { ...s, replaced: e.slot }
          : s;
      case "READY":
        return s.phase === "card"
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                durationMs: s.durationMs,
                startedAt: e.now ?? Date.now(),
                pausedAt: null,
                pausedTotalMs: 0,
              },
            }
          : s;
      case "PAUSE":
        return s.phase === "timer_running" && t
          ? { ...s, phase: "timer_paused", timer: { ...t, pausedAt: e.now } }
          : s;
      case "RESUME":
        return s.phase === "timer_paused" && t && t.pausedAt !== null
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                ...t,
                pausedAt: null,
                pausedTotalMs: t.pausedTotalMs + (e.now - t.pausedAt),
              },
            }
          : s;
      case "TICK":
        return s.phase === "timer_running" && t && remainingMs(s, e.now) <= 0
          ? { ...s, phase: "timer_expired", timer: { ...t, pausedAt: e.now } }
          : s;
      case "DONE":
        return ACTIVE.has(s.phase) ? { ...s, phase: "review" } : s;
      case "NEXT": {
        const elements = drawn(s);
        if (s.phase !== "review" || !elements) return s;
        return toRound(
          {
            ...s,
            completedRounds: [
              ...s.completedRounds,
              {
                roundIndex: s.roundIndex,
                cardId: elements.product.id,
                announcer: s.announcer,
                styleId: elements.style.id,
                audienceId: elements.audience.id,
              },
            ],
          },
          s.roundIndex + 1,
          begin,
        );
      }
      case "SKIP":
        return s.phase === "card" || s.phase === "review" || ACTIVE.has(s.phase)
          ? skipRound(s, begin)
          : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => {
    const performances: Record<Player, number> = { A: 0, B: 0 };
    for (const r of s.completedRounds) performances[r.announcer] += 1;
    return {
      completed: s.completedRounds.length,
      skipped: s.skippedRounds.length,
      performances,
    };
  },
};
