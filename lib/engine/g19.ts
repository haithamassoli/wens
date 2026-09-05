// G19 — The Shared Escape Room (FR-G19). One story, four locks. Per lock:
// handoff(A) → READY → private_view(A) → NEXT → handoff(B) → READY → private_view(B) → NEXT →
// input (discuss + answer: INPUT/DONE, HINT, REVEAL) → reveal → NEXT → next lock … → results.
// instructions → START → card (intro) → READY{now} starts the wall clock. PAUSE/RESUME freeze it.
import type { EscapeLock, G19Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, pickDeck } from "./util.ts";

export const LOCKS = 4;

const DIACRITICS = /[ً-ْٰـ]/g;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const NOT_ALNUM = /[^\p{L}\p{N}]/gu;
/** Loose Arabic match: no diacritics, unified hamza/ة/ى, ASCII digits, no spaces/punctuation. */
export function normalizeAnswer(s: string): string {
  return s
    .replace(DIACRITICS, "")
    .replace(ARABIC_DIGITS, (d) => String((d.codePointAt(0) ?? 0) % 16))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(NOT_ALNUM, "")
    .toLowerCase();
}

export const answerMatches = (lock: EscapeLock, attempt: string) => {
  const a = normalizeAnswer(attempt);
  return a.length > 0 && lock.answers.some((x) => normalizeAnswer(x) === a);
};

/** Editorial check mirrored in scripts/validate-content.mjs: every lock is self-contained. */
export function storyErrors(card: Pick<G19Card, "locks" | "ending">): string[] {
  const errs: string[] = [];
  if (card.locks.length !== LOCKS) errs.push(`locks must be ${LOCKS}`);
  card.locks.forEach((l, i) => {
    for (const k of [
      "title",
      "clueA",
      "clueB",
      "question",
      "hint",
      "solution",
      "explanation",
    ] as const)
      if (!l[k]?.trim()) errs.push(`lock ${i + 1}: ${k} missing`);
    if (!Array.isArray(l.answers) || !l.answers.some((a) => normalizeAnswer(a).length > 0))
      errs.push(`lock ${i + 1}: needs at least one answer`);
  });
  if (!card.ending?.trim()) errs.push("ending missing");
  return errs;
}

/** Persisted via useGameData("G19"): enough to resume the same story at the same lock. */
export interface Progress {
  storyId: string;
  lockIndex: number;
  startedAt: number;
  hintsUsed: number;
  revealsUsed: number;
  solved: number;
  skipped: number;
}
export interface G19Setup extends BaseSetup {
  storyId: string;
  resume?: Progress | null;
}
export interface G19Round extends RoundRecord {
  hintUsed: boolean;
  revealed: boolean; // solved by showing the solution
}
export interface G19State extends BaseState<G19Card, G19Round> {
  lock: number;
  viewer: Player; // whose private clue the handoff/private_view is for
  attempt: string;
  wrong: boolean;
  hintShown: boolean;
  revealed: boolean;
  timer: { startedAt: number; pausedAt: number | null; pausedTotalMs: number } | null;
  lastNow: number;
  carried: { hints: number; reveals: number; solved: number; skipped: number }; // from resume
}
export interface G19Result {
  solved: number;
  skipped: number;
  hints: number;
  reveals: number;
  elapsedMs: number;
  escaped: boolean; // reached the ending
}

export const currentLock = (s: G19State): EscapeLock | undefined => s.deck[0]?.locks[s.lock];

/** Wall-clock elapsed time excluding pauses; frozen at pausedAt while paused. */
export function elapsedMs(s: G19State, now = s.lastNow): number {
  const t = s.timer;
  if (!t) return 0;
  return Math.max(0, (t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs);
}

export const progressOf = (s: G19State): Progress => {
  const r = G19.deriveResult(s);
  return {
    storyId: s.deck[0]?.id ?? "",
    lockIndex: s.lock,
    startedAt: s.timer?.startedAt ?? s.lastNow,
    hintsUsed: r.hints,
    revealsUsed: r.reveals,
    solved: r.solved,
    skipped: r.skipped,
  };
};

const toLock = (s: G19State, i: number): G19State =>
  i >= LOCKS
    ? { ...s, lock: i, phase: "results", ended: true, endedEarly: false }
    : {
        ...s,
        lock: i,
        phase: "handoff",
        viewer: "A",
        attempt: "",
        wrong: false,
        hintShown: false,
        revealed: false,
      };

const LOCK_PHASES = new Set(["handoff", "private_view", "input", "reveal"]);

export const G19: GameDefinition<G19Card, G19Setup, G19State, G19Result> = {
  id: "G19",
  availableCount: (cards, setup) => availableCount(cards, (c) => c.id === setup.storyId),
  buildDeck: (cards, setup, seen) => pickDeck(cards, (c) => c.id === setup.storyId, seen, 1),
  initialState: (deck, setup) => {
    const r = setup.resume ?? null;
    return {
      ...baseState<G19Card, G19Round>("G19", deck, withDefaultAliases(setup.aliases)),
      lock: r?.lockIndex ?? 0,
      viewer: "A",
      attempt: "",
      wrong: false,
      hintShown: false,
      revealed: false,
      timer: r ? { startedAt: r.startedAt, pausedAt: null, pausedTotalMs: 0 } : null,
      lastNow: r?.startedAt ?? 0,
      carried: r
        ? { hints: r.hintsUsed, reveals: r.revealsUsed, solved: r.solved, skipped: r.skipped }
        : { hints: 0, reveals: 0, solved: 0, skipped: 0 },
    };
  },
  reduce(s, e) {
    if (s.ended) return s;
    const t = s.timer;
    if (e.type === "END") {
      const done =
        s.carried.solved + s.carried.skipped + s.completedRounds.length + s.skippedRounds.length;
      return { ...s, phase: "results", ended: true, endedEarly: done < LOCKS };
    }
    if (e.type === "TICK") return t && t.pausedAt === null ? { ...s, lastNow: e.now } : s;
    if (e.type === "PAUSE")
      return t && t.pausedAt === null && LOCK_PHASES.has(s.phase)
        ? { ...s, lastNow: e.now, timer: { ...t, pausedAt: e.now } }
        : s;
    if (e.type === "RESUME")
      return t && t.pausedAt !== null
        ? {
            ...s,
            lastNow: e.now,
            timer: { ...t, pausedAt: null, pausedTotalMs: t.pausedTotalMs + (e.now - t.pausedAt) },
          }
        : s;
    if (t?.pausedAt !== null && t !== null) return s; // frozen: only RESUME/END are meaningful
    const lock = currentLock(s);
    switch (s.phase) {
      case "instructions":
        return e.type === "START" ? (t ? toLock(s, s.lock) : { ...s, phase: "card" }) : s;
      case "card":
        return e.type === "READY"
          ? toLock(
              {
                ...s,
                lastNow: e.now ?? 0,
                timer: { startedAt: e.now ?? 0, pausedAt: null, pausedTotalMs: 0 },
              },
              0,
            )
          : s;
      case "handoff":
        if (e.type === "READY") return { ...s, phase: "private_view" };
        break;
      case "private_view":
        if (e.type === "NEXT")
          return s.viewer === "A"
            ? { ...s, phase: "handoff", viewer: "B" }
            : { ...s, phase: "input" };
        break;
      case "input": {
        if (!lock) return s;
        if (e.type === "INPUT")
          return e.field === "answer" && e.value !== s.attempt
            ? { ...s, attempt: e.value, wrong: false }
            : s;
        if (e.type === "HINT") return s.hintShown ? s : { ...s, hintShown: true };
        if (e.type === "DONE" || e.type === "REVEAL") {
          const revealed = e.type === "REVEAL";
          if (!revealed && !answerMatches(lock, s.attempt)) return { ...s, wrong: true };
          const rec: G19Round = {
            roundIndex: s.lock,
            cardId: `${s.deck[0].id}#${s.lock + 1}`,
            hintUsed: s.hintShown,
            revealed,
          };
          return { ...s, phase: "reveal", revealed, completedRounds: [...s.completedRounds, rec] };
        }
        break;
      }
      case "reveal":
        if (e.type === "NEXT") return toLock(s, s.lock + 1);
        break;
      default:
        return s;
    }
    if (e.type === "SKIP" && LOCK_PHASES.has(s.phase) && s.phase !== "reveal")
      return toLock({ ...s, skippedRounds: [...s.skippedRounds, s.lock] }, s.lock + 1);
    return s;
  },
  deriveResult: (s) => ({
    solved: s.carried.solved + s.completedRounds.length,
    skipped: s.carried.skipped + s.skippedRounds.length,
    hints:
      s.carried.hints +
      s.completedRounds.filter((r) => r.hintUsed).length +
      (s.hintShown && s.phase === "input" ? 1 : 0),
    reveals: s.carried.reveals + s.completedRounds.filter((r) => r.revealed).length,
    elapsedMs: elapsedMs(s),
    escaped: s.ended && !s.endedEarly,
  }),
};
