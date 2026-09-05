// Shared engine types (PRD §5, §9 DATA-01, §10). Pure, DOM-free.
import type { GameId } from "../content/types";

export type Player = "A" | "B";
export interface Aliases {
  A: string;
  B: string;
}
export const DEFAULT_ALIASES: Aliases = { A: "اللاعب الأول", B: "اللاعب الثاني" };
export const other = (p: Player): Player => (p === "A" ? "B" : "A");

/** Trim, cap at 20 chars, fall back to the default alias when empty. */
export function withDefaultAliases(a?: Partial<Aliases>): Aliases {
  const clean = (v: string | undefined, d: string) => (v ?? "").trim().slice(0, 20) || d;
  return { A: clean(a?.A, DEFAULT_ALIASES.A), B: clean(a?.B, DEFAULT_ALIASES.B) };
}

export type Event =
  | { type: "START" }
  | { type: "READY"; now?: number } // `now` is used by G09 to start the timer
  | { type: "SUBMIT"; player: Player; optionId: string }
  | { type: "LOCK"; player: Player }
  | { type: "NEXT" }
  | { type: "SKIP" }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "TICK"; now: number }
  | { type: "END" }
  | { type: "SPIN"; seed?: number }
  | { type: "DONE" }
  | { type: "RESET_POOL" }
  | { type: "RESHUFFLE" };

export type Phase =
  | "instructions"
  | "awaiting_ready"
  | "card"
  | "player_A_input"
  | "handoff"
  | "player_B_input"
  | "reveal"
  | "timer_ready"
  | "timer_running"
  | "timer_paused"
  | "timer_expired"
  | "wheel_idle"
  | "wheel_spinning"
  | "wheel_result"
  | "results";

export interface RoundRecord {
  roundIndex: number;
  cardId: string;
}

export interface BaseSetup {
  aliases?: Partial<Aliases>;
}

/** DATA-01: page-memory only. */
export interface BaseState<Card, Round extends RoundRecord = RoundRecord> {
  sessionId: string;
  gameId: GameId;
  roundIndex: number;
  phase: Phase;
  aliases: Aliases;
  deck: Card[];
  completedRounds: Round[];
  skippedRounds: number[]; // round indexes
  ended: boolean;
  endedEarly: boolean; // END before every slot was consumed
}

export interface GameDefinition<Card, Setup, State, Result> {
  id: GameId;
  /** Matching published cards, before the deck is cut (FR-CORE-03: show the real count). */
  availableCount(cards: Card[], setup: Setup): number;
  /** Published only, setup filters, shuffled without replacement, seen ids last. */
  buildDeck(cards: Card[], setup: Setup, seen: string[]): Card[];
  initialState(deck: Card[], setup: Setup): State;
  /** Returns the SAME reference when the event is invalid for the phase. */
  reduce(state: State, event: Event): State;
  /** Recomputed from completedRounds/skippedRounds, never from counters. */
  deriveResult(state: State): Result;
}
