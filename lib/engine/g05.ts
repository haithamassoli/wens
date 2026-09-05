// G05 — Finish the Sentence (FR-G05). Six cards, three answers each; the speaker alternates.
// Per round: timer_ready → READY → timer_running ⇄ timer_paused, TICK past zero → timer_expired;
// DONE → "review" (the partner restates what they understood) → NEXT → next round.
// With the timer disabled the round opens straight on `card` and DONE moves to the same review step.
import type { G05Card } from "../content/types";
import type { TimerState } from "./g09.ts";
import type { BaseSetup, BaseState, GameDefinition, Phase, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type G05Pack = "daily" | "feelings" | "us" | "future";
export const G05_PACKS: readonly G05Pack[] = ["daily", "feelings", "us", "future"];
/** Three answers per person (FR-G05 Result). */
export const G05_ROUNDS = 6;
export const G05_DEFAULT_SECONDS = 30;

export interface G05Setup extends BaseSetup {
  packs: G05Pack[];
  /** Seconds per answer, or null when the players turned the timer off. */
  timerSeconds: number | null;
}
export interface G05Round extends RoundRecord {
  speaker: Player;
}
export interface G05State extends BaseState<G05Card, G05Round> {
  speaker: Player; // who completes the sentence this round (A starts)
  timerSeconds: number | null;
  timer: TimerState | null; // null until READY, and always null when the timer is off
}
export interface G05Result {
  completed: number;
  skipped: number;
}

const inPack = (setup: G05Setup) => (c: G05Card) => setup.packs.includes(c.category as G05Pack);

/** Remaining time from wall-clock elapsed time, excluding pauses. Full duration before READY. */
export function g05RemainingMs(s: G05State, now: number): number {
  if (s.timerSeconds === null) return 0;
  const t = s.timer;
  if (!t) return s.timerSeconds * 1000;
  const elapsed = (t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs;
  return Math.min(t.durationMs, Math.max(0, t.durationMs - elapsed));
}

/** Phases in which the current speaker is still answering (Skip stays available in all of them). */
const ANSWERING = new Set<Phase>([
  "card",
  "timer_ready",
  "timer_running",
  "timer_paused",
  "timer_expired",
]);

const begin = (s: G05State, i: number): G05State => ({
  ...s,
  roundIndex: i,
  phase: s.timerSeconds === null ? "card" : "timer_ready",
  timer: null,
});

export const G05: GameDefinition<G05Card, G05Setup, G05State, G05Result> = {
  id: "G05",
  availableCount: (cards, setup) => availableCount(cards, inPack(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, inPack(setup), seen, G05_ROUNDS),
  initialState: (deck, setup) => ({
    ...baseState<G05Card, G05Round>("G05", deck, withDefaultAliases(setup.aliases)),
    speaker: "A",
    timerSeconds: setup.timerSeconds,
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
        return s.phase === "timer_ready" && s.timerSeconds !== null
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                durationMs: s.timerSeconds * 1000,
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
        return s.phase === "timer_running" && t && g05RemainingMs(s, e.now) <= 0
          ? { ...s, phase: "timer_expired", timer: { ...t, pausedAt: e.now } }
          : s;
      case "DONE":
        // The answer is finished; the partner now restates it before the round is recorded.
        return ANSWERING.has(s.phase) ? { ...s, phase: "review" } : s;
      case "NEXT": {
        if (s.phase !== "review") return s;
        const rec: G05Round = {
          roundIndex: s.roundIndex,
          cardId: s.deck[s.roundIndex].id,
          speaker: s.speaker,
        };
        return toRound(
          { ...s, speaker: other(s.speaker), completedRounds: [...s.completedRounds, rec] },
          s.roundIndex + 1,
          begin,
        );
      }
      case "SKIP":
        // FR-CORE-04 + FR-G05: skipping stays available while the timer is paused.
        return ANSWERING.has(s.phase) || s.phase === "review"
          ? skipRound({ ...s, speaker: other(s.speaker) }, begin)
          : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => ({ completed: s.completedRounds.length, skipped: s.skippedRounds.length }),
};
