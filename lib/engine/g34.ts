// G34 — Creative Photo Challenge (FR-G34). Three rounds, two themes per round (one each).
// card → (optional) timer_running ⇄ timer_paused → timer_expired → DONE → reveal (الأطرف) → next round.
// The photos are taken outside the app: nothing here touches a camera, a file or an upload.
// ponytail: no uploads at all — a private upload (and therefore storage, consent and deletion)
// is the R3 upgrade; the reducer stores only which theme was drawn and what the two of you picked.
import type { G34Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck } from "./util.ts";

export type G34Category = "home" | "outside" | "colours" | "details";
export type Funniest = "A" | "B" | "both";

export const G34_ROUNDS = 3;
export const G34_TIMER_MS = 15 * 60 * 1000;
const PER_ROUND = 2;

export interface G34Setup extends BaseSetup {
  categories: G34Category[]; // empty = every category
}
export interface G34Timer {
  durationMs: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
}
export interface G34Round extends RoundRecord {
  cardId: string; // the theme player A drew
  cardIdB: string; // the theme player B drew
  funniest: Funniest;
}
export interface G34State extends BaseState<G34Card, G34Round> {
  timer: G34Timer | null; // null until READY; the timer is always optional
  choice: Funniest | null; // the joint pick for the current round, before NEXT
}
export interface G34Result {
  completed: number;
  skipped: number;
  rounds: G34Round[];
}

const inCategory = (setup: G34Setup) => (c: G34Card) =>
  setup.categories.length === 0 || setup.categories.includes(c.category as G34Category);

/** Complete rounds the deck can serve (two themes each). */
export const roundCount = (s: G34State) => Math.floor(s.deck.length / PER_ROUND);

/** The two themes of round `i`: [A's, B's]. */
export const themesFor = (s: G34State, i: number): [G34Card, G34Card] => [
  s.deck[i * PER_ROUND],
  s.deck[i * PER_ROUND + 1],
];

/** Remaining time, excluding pauses. The full 15 minutes before READY. */
export function remaining(s: G34State, now: number): number {
  const t = s.timer;
  if (!t) return G34_TIMER_MS;
  return Math.max(0, t.durationMs - ((t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs));
}

const SHOOTING = new Set(["card", "timer_running", "timer_paused", "timer_expired"]);
const isFunniest = (v: unknown): v is Funniest => v === "A" || v === "B" || v === "both";

const begin = (s: G34State, i: number): G34State =>
  i >= roundCount(s)
    ? { ...s, phase: "results", ended: true, endedEarly: false }
    : { ...s, roundIndex: i, phase: "card", timer: null, choice: null };

export const G34: GameDefinition<G34Card, G34Setup, G34State, G34Result> = {
  id: "G34",
  availableCount: (cards, setup) => availableCount(cards, inCategory(setup)),
  buildDeck: (cards, setup, seen) =>
    pickDeck(cards, inCategory(setup), seen, G34_ROUNDS * PER_ROUND),
  initialState: (deck, setup) => ({
    ...baseState<G34Card, G34Round>("G34", deck, withDefaultAliases(setup.aliases)),
    timer: null,
    choice: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    const t = s.timer;
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? begin(s, 0) : s;
      case "READY": // starting the timer is optional; DONE from "card" skips it entirely
        return s.phase === "card"
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                durationMs: G34_TIMER_MS,
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
        return s.phase === "timer_running" && t && remaining(s, e.now) <= 0
          ? { ...s, phase: "timer_expired", timer: { ...t, pausedAt: e.now } }
          : s;
      case "DONE": // "نعرض الصور" — the photos live on your own phones, not here
        return SHOOTING.has(s.phase) ? { ...s, phase: "reveal" } : s;
      case "SET": // the pick is made together; no automated scoring decides it
        return s.phase === "reveal" && e.key === "funniest" && isFunniest(e.value)
          ? { ...s, choice: e.value }
          : s;
      case "NEXT": {
        if (s.phase !== "reveal" || s.choice === null) return s;
        const [a, b] = themesFor(s, s.roundIndex);
        const rec: G34Round = {
          roundIndex: s.roundIndex,
          cardId: a.id,
          cardIdB: b.id,
          funniest: s.choice,
        };
        return begin({ ...s, completedRounds: [...s.completedRounds, rec] }, s.roundIndex + 1);
      }
      case "SKIP":
        return SHOOTING.has(s.phase) || s.phase === "reveal"
          ? begin({ ...s, skippedRounds: [...s.skippedRounds, s.roundIndex] }, s.roundIndex + 1)
          : s;
      default:
        return s;
    }
  },
  // No tally of who won: the rounds are listed as they were played.
  deriveResult: (s) => ({
    completed: s.completedRounds.length,
    skipped: s.skippedRounds.length,
    rounds: s.completedRounds,
  }),
};
