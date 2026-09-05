// G22 — Letter Challenge (FR-G22). Each round: one letter, the 3 setup categories, 60 s per player.
// timer_ready(A) → READY → timer_running ⇄ timer_paused → LOCK or TICK past zero → handoff → READY →
// timer_ready(B) → … → review (auto-judged, manual verdict toggles) → NEXT.
// Score per category: 10 unique valid, 5 matching, 0 blank/rejected.
import type { G22Card } from "../content/types";
import type { TimerState } from "./g09.ts";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface G22Setup extends BaseSetup {
  letter: string | null; // fixed first letter, or null for random
  categories: string[]; // exactly 3 labels
  rounds: 3 | 5;
}
export type Verdict = boolean | null; // null = automatic judgement
export interface G22Round extends RoundRecord {
  answers: Record<Player, string[]>;
  accepted: Record<Player, boolean[]>;
  points: Record<Player, number>;
}
export interface G22State extends BaseState<G22Card, G22Round> {
  categories: string[];
  writer: Player;
  answers: Record<Player, string[]>;
  verdicts: Record<Player, Verdict[]>;
  timer: TimerState | null;
}
export interface G22Result {
  points: Record<Player, number>;
  completed: number;
  skipped: number;
  complete: boolean;
  winner: Player | "tie" | null;
}

export const G22_SECONDS = 60;
export const G22_CATEGORIES = 3;
export const isLetter = (c: G22Card) => c.category === "letter";

/** Strip diacritics/tatweel, unify أإآ→ا, ة→ه, ى→ي, collapse spaces. Exported for the tests. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

const blanks = () => Array.from({ length: G22_CATEGORIES }, () => "");
const nulls = () => Array.from({ length: G22_CATEGORIES }, () => null);

/** Effective verdicts (manual override wins, else non-blank) and the resulting points. */
export function judge(s: Pick<G22State, "answers" | "verdicts">) {
  const accepted: Record<Player, boolean[]> = { A: [], B: [] };
  const points: Record<Player, number> = { A: 0, B: 0 };
  for (let i = 0; i < G22_CATEGORIES; i++) {
    const a = normalizeArabic(s.answers.A[i] ?? "");
    const b = normalizeArabic(s.answers.B[i] ?? "");
    accepted.A[i] = s.verdicts.A[i] ?? a.length > 0;
    accepted.B[i] = s.verdicts.B[i] ?? b.length > 0;
    const match = accepted.A[i] && accepted.B[i] && a === b;
    if (accepted.A[i]) points.A += match ? 5 : 10;
    if (accepted.B[i]) points.B += match ? 5 : 10;
  }
  return { accepted, points };
}

export function g22RemainingMs(s: G22State, now: number): number {
  const t = s.timer;
  if (!t) return G22_SECONDS * 1000;
  return Math.max(0, t.durationMs - ((t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs));
}

const begin = (s: G22State, i: number): G22State => ({
  ...s,
  roundIndex: i,
  phase: "timer_ready",
  writer: "A",
  answers: { A: blanks(), B: blanks() },
  verdicts: { A: nulls(), B: nulls() },
  timer: null,
});
const lock = (s: G22State): G22State =>
  s.writer === "A"
    ? { ...s, phase: "handoff", timer: null }
    : { ...s, phase: "review", timer: null };
const WRITING = new Set(["timer_running", "timer_paused"]);

export const G22: GameDefinition<G22Card, G22Setup, G22State, G22Result> = {
  id: "G22",
  availableCount: (cards) => availableCount(cards, isLetter),
  buildDeck: (cards, setup, seen) => {
    const rest = pickDeck(cards, (c) => isLetter(c) && c.body !== setup.letter, seen);
    const first = setup.letter
      ? cards.find((c) => isLetter(c) && c.status === "published" && c.body === setup.letter)
      : undefined;
    return (first ? [first, ...rest] : rest).slice(0, setup.rounds);
  },
  initialState: (deck, setup) => ({
    ...baseState<G22Card, G22Round>("G22", deck, withDefaultAliases(setup.aliases)),
    categories: setup.categories.slice(0, G22_CATEGORIES),
    writer: "A",
    answers: { A: blanks(), B: blanks() },
    verdicts: { A: nulls(), B: nulls() },
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
        if (s.phase === "handoff") return { ...s, phase: "timer_ready", writer: "B" };
        return s.phase === "timer_ready"
          ? {
              ...s,
              phase: "timer_running",
              timer: {
                durationMs: G22_SECONDS * 1000,
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
        return s.phase === "timer_paused" && t?.pausedAt != null
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
        return s.phase === "timer_running" && t && g22RemainingMs(s, e.now) <= 0 ? lock(s) : s;
      case "INPUT": {
        const i = Number(e.field);
        if (!WRITING.has(s.phase) || !(i >= 0 && i < G22_CATEGORIES)) return s;
        const mine = s.answers[s.writer].slice();
        mine[i] = e.value;
        return { ...s, answers: { ...s.answers, [s.writer]: mine } };
      }
      case "LOCK":
        return WRITING.has(s.phase) && e.player === s.writer ? lock(s) : s;
      case "SET": {
        // key "A:1" / "B:0", value "1" (accepted) | "0" (rejected)
        const [p, idx] = e.key.split(":");
        const i = Number(idx);
        if (s.phase !== "review" || (p !== "A" && p !== "B") || !(i >= 0 && i < G22_CATEGORIES))
          return s;
        const v = s.verdicts[p].slice();
        v[i] = e.value === "1";
        return { ...s, verdicts: { ...s.verdicts, [p]: v } };
      }
      case "NEXT": {
        if (s.phase !== "review") return s;
        const { accepted, points } = judge(s);
        const rec: G22Round = {
          roundIndex: s.roundIndex,
          cardId: s.deck[s.roundIndex].id,
          answers: s.answers,
          accepted,
          points,
        };
        return toRound(
          { ...s, completedRounds: [...s.completedRounds, rec] },
          s.roundIndex + 1,
          begin,
        );
      }
      case "SKIP":
        return s.phase === "review" ? s : skipRound(s, begin);
      default:
        return s;
    }
  },
  deriveResult(s) {
    const points: Record<Player, number> = { A: 0, B: 0 };
    for (const r of s.completedRounds) {
      points.A += r.points.A;
      points.B += r.points.B;
    }
    const completed = s.completedRounds.length;
    const skipped = s.skippedRounds.length;
    const complete = s.deck.length > 0 && completed + skipped === s.deck.length;
    const winner = !complete ? null : points.A > points.B ? "A" : points.B > points.A ? "B" : "tie";
    return { points, completed, skipped, complete, winner };
  },
};
