// G29 — A Letter to the Future (FR-G29). Letters are stored on this device via
// useGameData("G29", { letters: [] }); the state is derived from today's local date, so a
// letter is never available one day early (Acceptance).
// ponytail: no server scheduling, no notifications, no time-zone negotiation — one device, one
// clock. Linked accounts + Convex scheduled delivery (and unlinking that stops it) are the R3 upgrade.
import type { G29Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type Recipient = Player | "both";

export interface Letter {
  id: string;
  from: Player;
  to: Recipient;
  openAt: string; // "YYYY-MM-DD", strictly after the day it was written
  body: string; // ≤1000
  createdAt: number; // epoch ms
}

export type LetterDraft = Pick<Letter, "from" | "to" | "openAt" | "body">;

/** User-facing states (the doc's Draft state lives in the compose screen, never in storage). */
export type LetterState = "locked" | "available";

export const LETTER_MAX_BODY = 1000;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: string) => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/**
 * ISO dates compare correctly as strings, so no Date maths and no time zone drift:
 * available only once today has actually reached openAt.
 */
export const stateOf = (l: Letter, today: string): LetterState =>
  l.openAt <= today ? "available" : "locked";

/** The author may delete a letter only while it is still locked. */
export const canDelete = (l: Letter, today: string): boolean => stateOf(l, today) === "locked";

/** Which field is wrong, or null when the draft can be saved. */
export function letterError(
  d: LetterDraft,
  today: string,
): "body" | "openAt" | "openAtPast" | null {
  if (d.body.trim().length === 0) return "body";
  if (d.body.trim().length > LETTER_MAX_BODY) return "body";
  if (!isDate(d.openAt)) return "openAt";
  if (d.openAt <= today) return "openAtPast"; // must open after today
  return null;
}

/** Prepends a trimmed letter. Returns the same list when the draft is invalid. */
export function addLetter(
  list: Letter[],
  d: LetterDraft,
  today: string,
  createdAt: number = Date.now(),
): Letter[] {
  if (letterError(d, today) !== null) return list;
  return [
    { id: crypto.randomUUID(), ...d, body: d.body.trim().slice(0, LETTER_MAX_BODY), createdAt },
    ...list,
  ];
}

/** Removes exactly one letter; the rest survive untouched. */
export const removeLetter = (list: Letter[], id: string): Letter[] =>
  list.filter((l) => l.id !== id);

/** Available letters first (soonest opened first), then locked ones by how soon they open. */
export function sortLetters(list: Letter[], today: string): Letter[] {
  return [...list].sort((a, b) => {
    const sa = stateOf(a, today);
    const sb = stateOf(b, today);
    if (sa !== sb) return sa === "available" ? -1 : 1;
    return sa === "available" ? b.openAt.localeCompare(a.openAt) : a.openAt.localeCompare(b.openAt);
  });
}

export const countByState = (list: Letter[], today: string) => ({
  available: list.filter((l) => stateOf(l, today) === "available").length,
  locked: list.filter((l) => stateOf(l, today) === "locked").length,
});

/* ------------------------------------------------------------------ */
/* Registry entry                                                       */
/* ------------------------------------------------------------------ */

export type G29State = BaseState<G29Card>;
export interface G29Result {
  completed: number;
  skipped: number;
}

const begin = (s: G29State, i: number): G29State => ({ ...s, roundIndex: i, phase: "card" });

/** The compose screen uses the starters as chips, not as a session; this keeps DEFINITIONS total. */
export const G29: GameDefinition<G29Card, BaseSetup, G29State, G29Result> = {
  id: "G29",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen),
  initialState: (deck, setup) => baseState("G29", deck, withDefaultAliases(setup.aliases)),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (s.phase !== "card") return s;
    if (e.type === "NEXT")
      return toRound(
        {
          ...s,
          completedRounds: [
            ...s.completedRounds,
            { roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id } as RoundRecord,
          ],
        },
        s.roundIndex + 1,
        begin,
      );
    if (e.type === "SKIP") return skipRound(s, begin);
    return s;
  },
  deriveResult: (s) => ({ completed: s.completedRounds.length, skipped: s.skippedRounds.length }),
};
