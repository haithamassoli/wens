// G25 — What Shall We Do? Wheel (FR-G25). The result is chosen before the animation.
// wheel_idle → SPIN → wheel_spinning → NEXT (animation done) → wheel_result → SPIN (another option) …
import type { WheelCard } from "../content/types";
import type { BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { DEFAULT_ALIASES } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck } from "./util.ts";

export interface G25Setup {
  location: "indoor" | "outdoor" | "any";
  costTier: "free" | "low" | "flexible" | "any";
  maxMinutes: number | null;
  noTools: boolean;
}
export interface G25State extends BaseState<WheelCard> {
  pool: string[]; // ids of every matching card
  shown: string[]; // ids already selected this session (excluded until exhausted)
  selectedId: string | null;
  done: boolean; // "We did it" for the selected activity (session only)
  exhausted: boolean; // last SPIN found nothing left to show
}
export interface G25Result {
  selectedId: string | null;
  done: boolean;
}

const COST_RANK = { free: 0, low: 1, flexible: 2 } as const;

export const matches = (setup: G25Setup) => (c: WheelCard) =>
  (setup.location === "any" || c.location === "any" || c.location === setup.location) &&
  (setup.costTier === "any" || COST_RANK[c.costTier] <= COST_RANK[setup.costTier]) &&
  (setup.maxMinutes === null || c.minMinutes <= setup.maxMinutes) &&
  !(setup.noTools && c.requiresTools);

/** Published cards matching the filters ("any" matches everything). */
export const matchingPool = (cards: WheelCard[], setup: G25Setup) =>
  cards.filter((c) => c.status === "published" && matches(setup)(c));

const pick = (ids: string[], seed?: number) =>
  ids[
    seed === undefined
      ? Math.floor(Math.random() * ids.length)
      : Math.abs(Math.trunc(seed)) % ids.length
  ];

export const G25: GameDefinition<WheelCard, G25Setup, G25State, G25Result> = {
  id: "G25",
  availableCount: (cards, setup) => availableCount(cards, matches(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, matches(setup), seen),
  initialState: (deck) => ({
    ...baseState<WheelCard, RoundRecord>("G25", deck, DEFAULT_ALIASES),
    pool: deck.map((c) => c.id),
    shown: [],
    selectedId: null,
    done: false,
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
        const candidates = s.pool.filter((id) => !s.shown.includes(id));
        if (candidates.length === 0) {
          return s.exhausted && s.phase === "wheel_idle"
            ? s
            : { ...s, phase: "wheel_idle", selectedId: null, done: false, exhausted: true };
        }
        const selectedId = pick(candidates, e.seed);
        return {
          ...s,
          phase: s.pool.length === 1 ? "wheel_result" : "wheel_spinning",
          selectedId,
          shown: [...s.shown, selectedId],
          done: false,
          exhausted: false,
        };
      }
      case "NEXT":
        return s.phase === "wheel_spinning" ? { ...s, phase: "wheel_result" } : s;
      case "DONE":
        return s.phase === "wheel_result" && !s.done ? { ...s, done: true } : s;
      case "RESET_POOL":
      case "RESHUFFLE":
        return s.shown.length || s.exhausted ? { ...s, shown: [], exhausted: false } : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => ({ selectedId: s.selectedId, done: s.done }),
};
