// G28 — Our Memory Map (FR-G28). A private album, not a round-based session: the value is in the
// pure helpers below. Memories live on this device via useGameData("G28", { memories: [] }).
// ponytail: text only — private cloud photos (upload, EXIF/location stripping, per-item
// permissions, thumbnail deletion) are the R3 upgrade; a city string replaces GPS until then.
import type { G28Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export interface Memory {
  id: string;
  title: string; // ≤60
  date: string; // "YYYY-MM-DD"
  city: string; // ≤30
  note?: string; // ≤200
  at: number; // epoch ms, when it was saved
}

export type MemoryDraft = Pick<Memory, "title" | "date" | "city"> & { note?: string };

export const MEMORY_LIMITS = { title: 60, city: 30, note: 200 } as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const clip = (v: string, max: number) => v.trim().slice(0, max);

/** Which field is wrong, or null when the draft can be saved. */
export function memoryError(d: MemoryDraft): "title" | "date" | "city" | "note" | null {
  if (clip(d.title, MEMORY_LIMITS.title).length === 0) return "title";
  if (!DATE.test(d.date) || Number.isNaN(Date.parse(`${d.date}T00:00:00Z`))) return "date";
  if (clip(d.city, MEMORY_LIMITS.city).length === 0) return "city";
  if ((d.note ?? "").trim().length > MEMORY_LIMITS.note) return "note";
  return null;
}

/** Prepends a trimmed, capped memory. Returns the same list when the draft is invalid. */
export function addMemory(list: Memory[], d: MemoryDraft, at: number = Date.now()): Memory[] {
  if (memoryError(d) !== null) return list;
  const note = clip(d.note ?? "", MEMORY_LIMITS.note);
  return [
    {
      id: crypto.randomUUID(),
      title: clip(d.title, MEMORY_LIMITS.title),
      date: d.date,
      city: clip(d.city, MEMORY_LIMITS.city),
      ...(note ? { note } : {}),
      at,
    },
    ...list,
  ];
}

/** Removes exactly one memory; every other memory survives untouched (Acceptance). */
export const removeMemory = (list: Memory[], id: string): Memory[] =>
  list.filter((m) => m.id !== id);

/** Distinct cities, in Arabic alphabetical order — the filter chips. */
export const citiesOf = (list: Memory[]): string[] =>
  [...new Set(list.map((m) => m.city))].sort((a, b) => a.localeCompare(b, "ar"));

export const byCity = (list: Memory[], city: string | null): Memory[] =>
  city === null ? list : list.filter((m) => m.city === city);

export interface YearGroup {
  year: string; // "2026"
  items: Memory[]; // newest first
}

/** Newest year first, newest memory first inside each year. */
export function groupByYear(list: Memory[]): YearGroup[] {
  const groups = new Map<string, Memory[]>();
  for (const m of [...list].sort((a, b) => b.date.localeCompare(a.date))) {
    const year = m.date.slice(0, 4);
    const bucket = groups.get(year);
    if (bucket) bucket.push(m);
    else groups.set(year, [m]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, items]) => ({ year, items }));
}

const DAY_MS = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/**
 * Whole days between today and the nearest recurrence of the memory's month-day.
 * Negative = it just passed, 0 = today, positive = coming up.
 */
export function daysToAnniversary(date: string, today: string): number {
  const d = new Date(utc(date));
  const t = utc(today);
  const year = new Date(t).getUTCFullYear();
  const diffs = [-1, 0, 1].map(
    (o) => (Date.UTC(year + o, d.getUTCMonth(), d.getUTCDate()) - t) / DAY_MS,
  );
  return diffs.reduce((best, x) => (Math.abs(x) < Math.abs(best) ? x : best));
}

/** "ذكرى سنوية" hint: the month-day falls within `within` days of today, either side. */
export const isAnniversarySoon = (date: string, today: string, within = 7): boolean =>
  Math.abs(daysToAnniversary(date, today)) <= within;

/* ------------------------------------------------------------------ */
/* Registry entry                                                       */
/* ------------------------------------------------------------------ */

export type G28State = BaseState<G28Card>;
export interface G28Result {
  completed: number;
  skipped: number;
}

const begin = (s: G28State, i: number): G28State => ({ ...s, roundIndex: i, phase: "card" });

/**
 * The album screen never runs a session; this exists so DEFINITIONS stays total and the
 * example prompts can be dealt like any other deck.
 */
export const G28: GameDefinition<G28Card, BaseSetup, G28State, G28Result> = {
  id: "G28",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen),
  initialState: (deck, setup) => baseState("G28", deck, withDefaultAliases(setup.aliases)),
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
