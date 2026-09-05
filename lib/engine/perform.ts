// Shared hidden-word + timer flow (G10, G11). One performer reads the card alone, hides it,
// then the timer runs facing the guesser:
//   private_view → READY → timer_running ⇄ (PAUSE/RESUME) timer_paused; TICK past zero → timer_expired.
// CORRECT scores the round for the performer; SKIP is free and never penalised. The performer
// alternates every round. Nothing derived from the state (rounds, result) carries the card text,
// so a screen that renders only the timer half of the state cannot leak the word.
import type { BaseCard, GameId } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface TimerState {
  durationMs: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
}

export interface PerformRound extends RoundRecord {
  performer: Player;
  correct: boolean;
}

export interface PerformState<Card> extends BaseState<Card, PerformRound> {
  performer: Player; // whoever holds the card this round (A starts)
  durationMs: number;
  timer: TimerState | null; // null until READY
}

export interface PerformResult {
  completed: number;
  skipped: number;
  correct: number;
  points: Record<Player, number>;
  turns: Record<Player, number>; // completed rounds per performer
}

export interface PerformConfig<Card extends BaseCard, Setup> {
  id: GameId;
  durationSeconds: number;
  rounds(setup: Setup): number;
  filter(setup: Setup): (card: Card) => boolean;
}

/** Remaining time from wall-clock elapsed time, excluding pauses. Full duration before READY. */
export function remainingMs(
  s: { durationMs: number; timer: TimerState | null },
  now: number,
): number {
  const t = s.timer;
  if (!t) return s.durationMs;
  const elapsed = (t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs;
  return Math.min(t.durationMs, Math.max(0, t.durationMs - elapsed));
}

/** Phases in which the round can be scored or skipped (the card is hidden in all of them). */
const ACTIVE = new Set(["timer_running", "timer_paused", "timer_expired"]);

export const performerAt = (roundIndex: number): Player => (roundIndex % 2 === 0 ? "A" : "B");

export function makePerformGame<Card extends BaseCard, Setup extends BaseSetup>(
  cfg: PerformConfig<Card, Setup>,
): GameDefinition<Card, Setup, PerformState<Card>, PerformResult> {
  type S = PerformState<Card>;
  const begin = (s: S, i: number): S => ({
    ...s,
    roundIndex: i,
    phase: "private_view",
    performer: performerAt(i),
    timer: null,
  });

  return {
    id: cfg.id,
    availableCount: (cards, setup) => availableCount(cards, cfg.filter(setup)),
    buildDeck: (cards, setup, seen) => pickDeck(cards, cfg.filter(setup), seen, cfg.rounds(setup)),
    initialState: (deck, setup) => ({
      ...baseState<Card, PerformRound>(cfg.id, deck, withDefaultAliases(setup.aliases)),
      performer: performerAt(0),
      durationMs: cfg.durationSeconds * 1000,
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
        case "CORRECT":
          // Rejected before READY: the card is still on screen, nothing has been performed yet.
          return ACTIVE.has(s.phase)
            ? toRound(
                {
                  ...s,
                  completedRounds: [
                    ...s.completedRounds,
                    {
                      roundIndex: s.roundIndex,
                      cardId: s.deck[s.roundIndex].id,
                      performer: s.performer,
                      correct: true,
                    },
                  ],
                },
                s.roundIndex + 1,
                begin,
              )
            : s;
        case "SKIP":
          return s.phase === "private_view" || ACTIVE.has(s.phase) ? skipRound(s, begin) : s;
        default:
          return s;
      }
    },
    deriveResult: (s) => {
      const points: Record<Player, number> = { A: 0, B: 0 };
      const turns: Record<Player, number> = { A: 0, B: 0 };
      for (const r of s.completedRounds) {
        turns[r.performer] += 1;
        if (r.correct) points[r.performer] += 1;
      }
      return {
        completed: s.completedRounds.length,
        skipped: s.skippedRounds.length,
        correct: points.A + points.B,
        points,
        turns,
      };
    },
  };
}
