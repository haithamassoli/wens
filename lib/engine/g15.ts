// G15 — Home Treasure Hunt (FR-G15). The path is user-authored (5 stations with a hint and a
// code) and locked before the phone is handed over; the deck of example cards is only shown
// to the creator. Player flow: instructions → input (station hint + code entry) … → results.
// DONE checks the typed code, HINT reveals the optional extra hint (no penalty), SKIP moves on.
import type { G15Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck } from "./util.ts";

export const STATIONS = 5;
export const HINT_MAX = 120;
export const CODE_MIN = 3;
export const CODE_MAX = 6;

export interface Station {
  hint: string; // ≤120 chars, what the player sees
  code: string; // 3–6 letters/digits, never shown to the player
  extraHint: string; // optional, revealed on request, "" when absent
}
/** Persisted via useGameData("G15"): the locked path and whether play has started. */
export interface Path {
  stations: Station[];
  lockedAt: number;
  started: boolean; // once true the creator can no longer edit (only "مسار جديد")
}

export const emptyStations = (): Station[] =>
  Array.from({ length: STATIONS }, () => ({ hint: "", code: "", extraHint: "" }));

const DIACRITICS = /[ً-ْٰـ]/g;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
/** Trim, lowercase, strip Arabic diacritics/tatweel, map Arabic-Indic digits to ASCII. */
export function normalizeCode(s: string): string {
  return s
    .trim()
    .replace(DIACRITICS, "")
    .replace(ARABIC_DIGITS, (d) => String((d.codePointAt(0) ?? 0) % 16))
    .toLowerCase();
}

const CODE_RE = new RegExp(`^[\\p{L}\\p{N}]{${CODE_MIN},${CODE_MAX}}$`, "u");

/** Arabic error messages for one station ([] when valid). */
export function stationErrors(st: Station): string[] {
  const errs: string[] = [];
  const hint = st.hint.trim();
  if (!hint) errs.push("اكتب دليلاً.");
  else if (hint.length > HINT_MAX) errs.push(`الدليل أطول من ${HINT_MAX} حرفاً.`);
  if (!CODE_RE.test(normalizeCode(st.code)))
    errs.push(`الرمز من ${CODE_MIN} إلى ${CODE_MAX} أحرف أو أرقام.`);
  if (st.extraHint.trim().length > HINT_MAX) errs.push(`التلميح الإضافي أطول من ${HINT_MAX} حرفاً.`);
  return errs;
}

export const pathValid = (stations: Station[]) =>
  stations.length === STATIONS && stations.every((s) => stationErrors(s).length === 0);

/** What the player may see: hints only. Codes never leave this projection. */
export function playerView(stations: Station[]): { hint: string; extraHint: string }[] {
  return stations.map((s) => ({ hint: s.hint.trim(), extraHint: s.extraHint.trim() }));
}

export interface G15Setup extends BaseSetup {
  stations: Station[];
}
export interface G15Round extends RoundRecord {
  extraHintUsed: boolean;
}
export interface G15State extends BaseState<G15Card, G15Round> {
  stations: Station[];
  station: number; // current station index
  attempt: string;
  wrong: boolean; // last DONE did not match
  extraShown: boolean;
}
export interface G15Result {
  solved: number;
  skipped: number;
  total: number;
  completed: boolean; // every station solved
}

const at = (s: G15State, i: number): G15State =>
  i >= s.stations.length
    ? { ...s, station: i, phase: "results", ended: true, endedEarly: false }
    : { ...s, station: i, phase: "input", attempt: "", wrong: false, extraShown: false };

export const G15: GameDefinition<G15Card, G15Setup, G15State, G15Result> = {
  id: "G15",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen),
  initialState: (deck, setup) => ({
    ...baseState<G15Card, G15Round>("G15", deck, withDefaultAliases(setup.aliases)),
    stations: setup.stations,
    station: 0,
    attempt: "",
    wrong: false,
    extraShown: false,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") {
      const consumed = s.completedRounds.length + s.skippedRounds.length;
      return { ...endEarly(s), endedEarly: consumed < s.stations.length };
    }
    if (e.type === "START") return s.phase === "instructions" ? at(s, 0) : s;
    if (s.phase !== "input") return s;
    const st = s.stations[s.station];
    switch (e.type) {
      case "INPUT":
        return e.field === "code" && e.value !== s.attempt
          ? { ...s, attempt: e.value, wrong: false }
          : s;
      case "DONE": {
        if (normalizeCode(s.attempt) !== normalizeCode(st.code)) return { ...s, wrong: true };
        const rec: G15Round = {
          roundIndex: s.station,
          cardId: `station-${s.station + 1}`,
          extraHintUsed: s.extraShown,
        };
        return at({ ...s, completedRounds: [...s.completedRounds, rec] }, s.station + 1);
      }
      case "HINT":
        return st.extraHint.trim() && !s.extraShown ? { ...s, extraShown: true } : s;
      case "SKIP":
        return at({ ...s, skippedRounds: [...s.skippedRounds, s.station] }, s.station + 1);
      default:
        return s;
    }
  },
  deriveResult: (s) => ({
    solved: s.completedRounds.length,
    skipped: s.skippedRounds.length,
    total: s.stations.length,
    completed: s.completedRounds.length === s.stations.length,
  }),
};
