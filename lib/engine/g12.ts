// G12 — A Story, One Word at a Time (FR-G12). One opening, alternating turns, up to 20 segments.
// instructions → input (INPUT draft → NEXT commits, UNDO pops) → DONE → results (the whole story).
// SKIP swaps the opening only while the story is still empty. Nothing is saved; END clears it.
import type { G12Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type G12Setup = BaseSetup;
export interface G12Segment {
  player: Player;
  text: string;
}
export interface G12State extends BaseState<G12Card> {
  turn: Player;
  draft: string;
  segments: G12Segment[];
}
export interface G12Result {
  finished: boolean; // finishing the story is the win
  turns: number;
  story: string; // "" unless finished
}

export const G12_MAX_TURNS = 20;
export const G12_MAX_CHARS = 120;
const OPENINGS = 3; // SKIP can swap the opening twice before the deck runs out

/** Opening + every segment, in order, space-joined. */
export const storyText = (s: G12State) =>
  [s.deck[s.roundIndex]?.body ?? "", ...s.segments.map((x) => x.text)].join(" ").trim();

const begin = (s: G12State, i: number): G12State => ({
  ...s,
  roundIndex: i,
  phase: "input",
  turn: "A",
  draft: "",
  segments: [],
});

export const G12: GameDefinition<G12Card, G12Setup, G12State, G12Result> = {
  id: "G12",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen, OPENINGS),
  initialState: (deck, setup) => ({
    ...baseState<G12Card, RoundRecord>("G12", deck, withDefaultAliases(setup.aliases)),
    turn: "A",
    draft: "",
    segments: [],
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return { ...endEarly(s), segments: [], draft: "" }; // leaving clears it
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (s.phase !== "input") return s;
    switch (e.type) {
      case "INPUT":
        return e.field === "text" && e.value.length <= G12_MAX_CHARS && e.value !== s.draft
          ? { ...s, draft: e.value }
          : s;
      case "NEXT": {
        const text = s.draft.trim();
        if (!text || s.segments.length >= G12_MAX_TURNS) return s;
        return {
          ...s,
          segments: [...s.segments, { player: s.turn, text }],
          turn: other(s.turn),
          draft: "",
        };
      }
      case "UNDO": {
        const last = s.segments[s.segments.length - 1];
        return last ? { ...s, segments: s.segments.slice(0, -1), turn: last.player, draft: "" } : s;
      }
      case "DONE":
        return s.segments.length
          ? {
              ...s,
              phase: "results",
              ended: true,
              endedEarly: false,
              draft: "",
              completedRounds: [{ roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id }],
            }
          : s;
      case "SKIP":
        return s.segments.length === 0 ? skipRound(s, begin) : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => {
    const finished = s.completedRounds.length === 1;
    return { finished, turns: s.segments.length, story: finished ? storyText(s) : "" };
  },
};
