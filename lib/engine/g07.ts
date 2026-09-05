// G07 — Two Truths and a Fiction (FR-G07). Fixed 6 rounds, writer alternates A/B (equal turns).
// player_<writer>_input (3 statements + secret fiction) → handoff → player_<guesser>_input → reveal.
// Cards are optional inspiration prompts; the loop never depends on the deck.
import type { G07Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Phase, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, pickDeck } from "./util.ts";

export type G07Setup = BaseSetup;
export type Statements = [string, string, string];
export interface G07Round extends RoundRecord {
  writer: Player;
  statements: Statements;
  fiction: number;
  guess: number;
  correct: boolean;
}
export interface G07State extends BaseState<G07Card, G07Round> {
  writer: Player;
  statements: Statements;
  fiction: number | null; // kept in state, never rendered to the guesser (FR-G07 acceptance)
  guess: number | null;
}
export interface G07Result {
  points: Record<Player, number>;
  completed: number;
  skipped: number;
  complete: boolean;
  winner: Player | "tie" | null;
}

export const G07_ROUNDS = 6;
export const G07_MAX_CHARS = 80;
const FIELDS = ["s1", "s2", "s3"] as const;
const writerFor = (i: number): Player => (i % 2 === 0 ? "A" : "B");
const inputPhase = (p: Player): Phase => `player_${p}_input`;

/** Three distinct non-empty statements (≤80 chars) and exactly one fiction. */
export function isValidForm(statements: Statements, fiction: number | null): boolean {
  const clean = statements.map((s) => s.trim());
  return (
    clean.every((s) => s.length > 0 && s.length <= G07_MAX_CHARS) &&
    new Set(clean).size === 3 &&
    fiction !== null &&
    Number.isInteger(fiction) &&
    fiction >= 0 &&
    fiction < 3
  );
}

const begin = (s: G07State, i: number): G07State => ({
  ...s,
  roundIndex: i,
  writer: writerFor(i),
  statements: ["", "", ""],
  fiction: null,
  guess: null,
  phase: inputPhase(writerFor(i)),
});
const finish = (s: G07State, early: boolean): G07State => ({
  ...s,
  phase: "results",
  ended: true,
  endedEarly: early,
  statements: ["", "", ""],
  fiction: null,
  guess: null,
});
/** Fixed-length loop: the deck (prompts) may be shorter than the rounds, or empty. */
const advance = (s: G07State, i: number): G07State =>
  i >= G07_ROUNDS ? finish(s, false) : begin(s, i);

export const G07: GameDefinition<G07Card, G07Setup, G07State, G07Result> = {
  id: "G07",
  availableCount: (cards) => availableCount(cards, () => true),
  // ponytail: prompts are inspiration only; cycle them so every round has one when any exist.
  buildDeck: (cards, _setup, seen) => {
    const picked = pickDeck(cards, () => true, seen, G07_ROUNDS);
    return picked.length
      ? Array.from({ length: G07_ROUNDS }, (_, i) => picked[i % picked.length])
      : [];
  },
  initialState: (deck, setup) => ({
    ...baseState<G07Card, G07Round>("G07", deck, withDefaultAliases(setup.aliases)),
    writer: "A",
    statements: ["", "", ""],
    fiction: null,
    guess: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END")
      return finish(s, s.completedRounds.length + s.skippedRounds.length < G07_ROUNDS);
    if (e.type === "START") return s.phase === "instructions" ? advance(s, 0) : s;
    const writing = s.phase === inputPhase(s.writer);
    const guessing = s.phase === inputPhase(other(s.writer));
    switch (e.type) {
      case "INPUT": {
        const idx = FIELDS.indexOf(e.field as (typeof FIELDS)[number]);
        if (!writing || idx < 0 || e.value.length > G07_MAX_CHARS) return s;
        const statements = [...s.statements] as Statements;
        statements[idx] = e.value;
        return { ...s, statements };
      }
      case "SET":
        return writing &&
          e.key === "fiction" &&
          typeof e.value === "number" &&
          e.value >= 0 &&
          e.value < 3
          ? { ...s, fiction: e.value }
          : s;
      case "SUBMIT": {
        const guess = Number(e.optionId);
        return guessing && e.player === other(s.writer) && [0, 1, 2].includes(guess)
          ? { ...s, guess }
          : s;
      }
      case "LOCK": {
        if (writing && e.player === s.writer && isValidForm(s.statements, s.fiction))
          return { ...s, phase: "handoff" };
        if (guessing && e.player === other(s.writer) && s.guess !== null && s.fiction !== null) {
          const rec: G07Round = {
            roundIndex: s.roundIndex,
            cardId: s.deck[s.roundIndex]?.id ?? "",
            writer: s.writer,
            statements: s.statements.map((t) => t.trim()) as Statements,
            fiction: s.fiction,
            guess: s.guess,
            correct: s.guess === s.fiction,
          };
          return { ...s, phase: "reveal", completedRounds: [...s.completedRounds, rec] };
        }
        return s;
      }
      case "READY":
        return s.phase === "handoff" ? { ...s, phase: inputPhase(other(s.writer)) } : s;
      case "NEXT":
        return s.phase === "reveal" ? advance(s, s.roundIndex + 1) : s;
      case "SKIP":
        return writing || guessing || s.phase === "handoff"
          ? advance({ ...s, skippedRounds: [...s.skippedRounds, s.roundIndex] }, s.roundIndex + 1)
          : s;
      default:
        return s;
    }
  },
  deriveResult(s) {
    const points: Record<Player, number> = { A: 0, B: 0 };
    for (const r of s.completedRounds) if (r.correct) points[other(r.writer)]++;
    const completed = s.completedRounds.length;
    const skipped = s.skippedRounds.length;
    const complete = completed + skipped === G07_ROUNDS;
    const winner = !complete ? null : points.A > points.B ? "A" : points.B > points.A ? "B" : "tie";
    return { points, completed, skipped, complete, winner };
  },
};
