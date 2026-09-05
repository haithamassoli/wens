// G20 — Object Memory (FR-G20). Four rounds, roles alternating A,B,A,B.
// timer_ready → READY → timer_running (grid visible ~10s, PAUSE/RESUME) → TICK/DONE → input
// → SUBMIT toggles picks → DONE → reveal → NEXT → next round.
// Score per round = correct − wrong, floored at zero. Ties are fine.
import type { G20Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, pickDeck, shuffle } from "./util.ts";

export type G20Level = 4 | 6 | 9;
export const G20_ROUNDS = 4; // two per player
export const G20_VIEW_MS = 10_000;
/** Choices offered after the grid, per level (FR-G20: every target is among them). */
export const G20_OPTIONS: Record<G20Level, number> = { 4: 8, 6: 12, 9: 15 };
export const G20_LEVELS: readonly G20Level[] = [4, 6, 9];

export interface G20Setup extends BaseSetup {
  level: G20Level;
  wordsOnly: boolean; // «كلمات بدل الرموز» — presentation only, the engine is unaffected
}

export interface G20Grid {
  targets: string[]; // card ids shown in the grid; never duplicated
  options: string[]; // card ids offered afterwards; contains every target, no duplicates
}

export interface G20Round extends RoundRecord {
  player: Player;
  correct: number;
  wrong: number;
  score: number;
}

export interface G20State extends BaseState<G20Card, G20Round> {
  level: G20Level;
  wordsOnly: boolean; // presentation flag carried for the UI
  grids: G20Grid[]; // one per round, generated up front from the whole pool
  selected: string[];
  timer: { startedAt: number; pausedAt: number | null; pausedTotalMs: number } | null;
}

export interface G20Result {
  A: number;
  B: number;
  rounds: number;
  skipped: number;
}

/** Whose memory the round tests: A, B, A, B. */
export const playerOfRound = (i: number): Player => (i % 2 === 0 ? "A" : "B");

/**
 * One grid: `level` distinct targets plus distractors, all drawn from the same shuffled pool,
 * so no target repeats and every target is present among the options. Randomness here is
 * independent of the `seen` history — a memory grid has nothing to keep fresh.
 */
export function makeGrid(
  pool: G20Card[],
  level: G20Level,
  rng: () => number = Math.random,
): G20Grid {
  const drawn = shuffle(pool, rng).slice(0, G20_OPTIONS[level]);
  const targets = drawn.slice(0, level).map((c) => c.id);
  return { targets, options: shuffle(drawn, rng).map((c) => c.id) };
}

/** Elapsed-aware countdown for the memorise phase; the full window before READY. */
export function viewRemainingMs(s: G20State, now: number): number {
  const t = s.timer;
  if (!t) return G20_VIEW_MS;
  return Math.max(0, G20_VIEW_MS - ((t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs));
}

const begin = (s: G20State, i: number): G20State =>
  i >= G20_ROUNDS
    ? { ...s, phase: "results", ended: true, endedEarly: false }
    : { ...s, roundIndex: i, phase: "timer_ready", selected: [], timer: null };

const finish = (s: G20State): G20State => ({
  ...s,
  phase: "results",
  ended: true,
  endedEarly: s.completedRounds.length + s.skippedRounds.length < G20_ROUNDS,
});

const SKIPPABLE = new Set(["timer_ready", "timer_running", "timer_paused", "input"]);

export const G20: GameDefinition<G20Card, G20Setup, G20State, G20Result> = {
  id: "G20",
  availableCount: (cards) => availableCount(cards, () => true),
  /** The whole published pool: grids are cut from it, not from a per-round deck. */
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen),
  initialState: (deck, setup) => ({
    ...baseState<G20Card, G20Round>("G20", deck, withDefaultAliases(setup.aliases)),
    level: setup.level,
    wordsOnly: setup.wordsOnly,
    grids: Array.from({ length: G20_ROUNDS }, () => makeGrid(deck, setup.level)),
    selected: [],
    timer: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return finish(s);
    if (e.type === "START") return s.phase === "instructions" ? begin(s, 0) : s;
    if (e.type === "SKIP")
      return SKIPPABLE.has(s.phase)
        ? begin({ ...s, skippedRounds: [...s.skippedRounds, s.roundIndex] }, s.roundIndex + 1)
        : s;
    if (e.type === "NEXT") return s.phase === "reveal" ? begin(s, s.roundIndex + 1) : s;
    const t = s.timer;
    switch (e.type) {
      case "READY":
        return s.phase === "timer_ready"
          ? {
              ...s,
              phase: "timer_running",
              timer: { startedAt: e.now ?? Date.now(), pausedAt: null, pausedTotalMs: 0 },
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
        return s.phase === "timer_running" && viewRemainingMs(s, e.now) <= 0
          ? { ...s, phase: "input" }
          : s;
      case "SUBMIT": {
        if (s.phase !== "input") return s;
        const grid = s.grids[s.roundIndex];
        if (!grid.options.includes(e.optionId)) return s;
        return {
          ...s,
          selected: s.selected.includes(e.optionId)
            ? s.selected.filter((id) => id !== e.optionId)
            : [...s.selected, e.optionId],
        };
      }
      case "DONE": {
        if (s.phase === "timer_running" || s.phase === "timer_paused")
          return { ...s, phase: "input" }; // «أخفِ الآن»
        if (s.phase !== "input") return s;
        const grid = s.grids[s.roundIndex];
        const correct = s.selected.filter((id) => grid.targets.includes(id)).length;
        const wrong = s.selected.length - correct;
        return {
          ...s,
          phase: "reveal",
          completedRounds: [
            ...s.completedRounds,
            {
              roundIndex: s.roundIndex,
              cardId: grid.targets[0],
              player: playerOfRound(s.roundIndex),
              correct,
              wrong,
              score: Math.max(0, correct - wrong),
            },
          ],
        };
      }
      default:
        return s;
    }
  },
  deriveResult: (s) => ({
    A: s.completedRounds.filter((r) => r.player === "A").reduce((n, r) => n + r.score, 0),
    B: s.completedRounds.filter((r) => r.player === "B").reduce((n, r) => n + r.score, 0),
    rounds: s.completedRounds.length,
    skipped: s.skippedRounds.length,
  }),
};
