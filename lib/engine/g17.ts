// G17 — Draw and Guess, one-device pass-and-play. 6 rounds, the artist alternates (A first).
// private_view (artist reads the word) → READY{now} → timer_running ⇄ timer_paused;
// CORRECT → reveal (1 point) → NEXT; TICK past zero → timer_expired (word shown) → NEXT (no point).
// Strokes live in the play screen, never here. The word is visible only where `wordVisible` says.
// ponytail: two-phone play (stroke transmission, typed guesses) is the Convex-sync upgrade.
import type { G17Card } from "../content/types";
import type { TimerState } from "./g09.ts";
import type { BaseSetup, BaseState, GameDefinition, Phase, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export const G17_ROUNDS = 6;
export const G17_SECONDS = 60;

export type G17Setup = BaseSetup;
export interface G17Round extends RoundRecord {
  artist: Player;
  correct: boolean;
}
export interface G17State extends BaseState<G17Card, G17Round> {
  artist: Player;
  timer: TimerState | null;
}
export interface G17Result {
  points: number; // one per correct guess, shared by the pair
  byArtist: Record<Player, number>; // correct guesses of each player's drawings
  completed: number;
  skipped: number;
}

export const artistOf = (roundIndex: number): Player => (roundIndex % 2 === 0 ? "A" : "B");
/** The secret word may be in the DOM only while the artist reads it and after the round. */
export const wordVisible = (phase: Phase) =>
  phase === "private_view" || phase === "reveal" || phase === "timer_expired";

const begin = (s: G17State, i: number): G17State => ({
  ...s,
  roundIndex: i,
  phase: "private_view",
  artist: artistOf(i),
  timer: null,
});

export function drawRemainingMs(s: G17State, now: number): number {
  const t = s.timer;
  if (!t) return G17_SECONDS * 1000;
  const elapsed = (t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs;
  return Math.min(t.durationMs, Math.max(0, t.durationMs - elapsed));
}

const record = (s: G17State, correct: boolean): G17Round => ({
  roundIndex: s.roundIndex,
  cardId: s.deck[s.roundIndex].id,
  artist: s.artist,
  correct,
});

export const G17: GameDefinition<G17Card, G17Setup, G17State, G17Result> = {
  id: "G17",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen, G17_ROUNDS),
  initialState: (deck, setup) => ({
    ...baseState<G17Card, G17Round>("G17", deck, withDefaultAliases(setup.aliases)),
    artist: "A",
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
        return s.phase === "private_view"
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                durationMs: G17_SECONDS * 1000,
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
        return s.phase === "timer_running" && t && drawRemainingMs(s, e.now) <= 0
          ? { ...s, phase: "timer_expired", timer: { ...t, pausedAt: e.now } }
          : s;
      case "CORRECT":
        return s.phase === "timer_running" || s.phase === "timer_paused"
          ? { ...s, phase: "reveal", completedRounds: [...s.completedRounds, record(s, true)] }
          : s;
      case "NEXT":
        if (s.phase === "reveal") return toRound(s, s.roundIndex + 1, begin);
        if (s.phase === "timer_expired")
          return toRound(
            { ...s, completedRounds: [...s.completedRounds, record(s, false)] },
            s.roundIndex + 1,
            begin,
          );
        return s;
      case "SKIP":
        return s.phase === "private_view" || s.phase.startsWith("timer_") ? skipRound(s, begin) : s;
      default:
        return s;
    }
  },
  deriveResult(s) {
    const byArtist = { A: 0, B: 0 };
    for (const r of s.completedRounds) if (r.correct) byArtist[r.artist] += 1;
    return {
      points: byArtist.A + byArtist.B,
      byArtist,
      completed: s.completedRounds.length,
      skipped: s.skippedRounds.length,
    };
  },
};
