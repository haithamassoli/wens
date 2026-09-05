// G09 — One-Minute Challenges (FR-G09). 5 cooperative cards; drawing never starts the timer.
// timer_ready → READY → timer_running ⇄ (PAUSE/RESUME) timer_paused; TICK past zero → timer_expired.
// DONE / SKIP record the card and draw the next one.
import type { TimerCard } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface G09Setup extends BaseSetup {
  noTools: boolean;
  noMovement: boolean;
}
export interface TimerState {
  durationMs: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
}
export interface G09State extends BaseState<TimerCard> {
  timer: TimerState | null; // null until READY
}
export interface G09Result {
  completed: number;
  skipped: number;
}

export const G09_ROUNDS = 5;

const fits = (setup: G09Setup) => (c: TimerCard) =>
  !(setup.noTools && c.requiresTools) && !(setup.noMovement && c.requiresMovement);
const begin = (s: G09State, i: number): G09State => ({
  ...s,
  roundIndex: i,
  phase: "timer_ready",
  timer: null,
});

/** Remaining time from elapsed wall-clock time, excluding pauses. Full duration before READY. */
export function remainingMs(s: G09State, now: number): number {
  const t = s.timer;
  if (!t) return (s.deck[s.roundIndex]?.durationSeconds ?? 0) * 1000;
  const elapsed = (t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs;
  return Math.max(0, t.durationMs - elapsed);
}

const ACTIVE = new Set(["timer_running", "timer_paused", "timer_expired"]);

export const G09: GameDefinition<TimerCard, G09Setup, G09State, G09Result> = {
  id: "G09",
  availableCount: (cards, setup) => availableCount(cards, fits(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, fits(setup), seen, G09_ROUNDS),
  initialState: (deck, setup) => ({
    ...baseState<TimerCard, RoundRecord>("G09", deck, withDefaultAliases(setup.aliases)),
    timer: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    const t = s.timer;
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? toRound(s, 0, begin) : s;
      case "READY":
        return s.phase === "timer_ready"
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                durationMs: s.deck[s.roundIndex].durationSeconds * 1000,
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
        return s.phase === "timer_paused" && t?.pausedAt !== null && t
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
        return ACTIVE.has(s.phase)
          ? toRound(
              {
                ...s,
                completedRounds: [
                  ...s.completedRounds,
                  { roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id },
                ],
              },
              s.roundIndex + 1,
              begin,
            )
          : s;
      case "SKIP":
        return s.phase === "timer_ready" || ACTIVE.has(s.phase) ? skipRound(s, begin) : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => ({ completed: s.completedRounds.length, skipped: s.skippedRounds.length }),
};
