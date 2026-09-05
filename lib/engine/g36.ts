// G36 — A Good Deed Together (FR-G36). A pool of voluntary ideas, one shown at a time.
// wheel_idle → SPIN → wheel_result → («نقبل» DONE | another SPIN) …
// No points, no streaks, no worship logging; skipping an idea costs nothing.
import type { G36Card } from "../content/types";
import type { BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { DEFAULT_ALIASES } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck } from "./util.ts";

export interface G36Setup {
  freeOnly: boolean; // «بدون تكلفة»
}

export interface G36State extends BaseState<G36Card> {
  pool: string[]; // ids of every matching idea
  shown: string[]; // ids already offered this session
  selectedId: string | null;
  accepted: boolean; // «نقبل» for the current idea (session only)
  exhausted: boolean; // the last SPIN found nothing new
}

export interface G36Result {
  selectedId: string | null;
  accepted: boolean;
}

const matches = (setup: G36Setup) => (c: G36Card) => !setup.freeOnly || c.costTier === "free";

/** Published ideas matching the filter. */
export const matchingIdeas = (cards: G36Card[], setup: G36Setup) =>
  cards.filter((c) => c.status === "published" && matches(setup)(c));

const pick = (ids: string[], seed?: number) =>
  ids[
    seed === undefined
      ? Math.floor(Math.random() * ids.length)
      : Math.abs(Math.trunc(seed)) % ids.length
  ];

export const G36: GameDefinition<G36Card, G36Setup, G36State, G36Result> = {
  id: "G36",
  availableCount: (cards, setup) => availableCount(cards, matches(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, matches(setup), seen),
  initialState: (deck) => ({
    ...baseState<G36Card, RoundRecord>("G36", deck, DEFAULT_ALIASES),
    pool: deck.map((c) => c.id),
    shown: [],
    selectedId: null,
    accepted: false,
    exhausted: false,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? { ...s, phase: "wheel_idle" } : s;
      case "SPIN": {
        if (s.phase !== "wheel_idle" && s.phase !== "wheel_result") return s;
        const left = s.pool.filter((id) => !s.shown.includes(id));
        if (left.length === 0)
          return s.exhausted && s.phase === "wheel_idle"
            ? s
            : { ...s, phase: "wheel_idle", selectedId: null, accepted: false, exhausted: true };
        const selectedId = pick(left, e.seed);
        return {
          ...s,
          phase: "wheel_result",
          selectedId,
          shown: [...s.shown, selectedId],
          accepted: false,
          exhausted: false,
        };
      }
      case "DONE":
        return s.phase === "wheel_result" && !s.accepted ? { ...s, accepted: true } : s;
      case "RESET_POOL":
      case "RESHUFFLE":
        return s.shown.length || s.exhausted ? { ...s, shown: [], exhausted: false } : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => ({ selectedId: s.selectedId, accepted: s.accepted }),
};
