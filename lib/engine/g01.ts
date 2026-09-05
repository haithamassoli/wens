// G01 — Conversation Starters (FR-G01). Card-only: instructions → card … → results.
import type { ConversationCard } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, Player, RoundRecord } from "./types.ts";
import { other, withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

export type Pack = "light" | "memories" | "dreams";
export interface G01Setup extends BaseSetup {
  packs: Pack[];
  rounds: 5 | 10;
}
export interface G01Round extends RoundRecord {
  speaker: Player;
}
export interface G01State extends BaseState<ConversationCard, G01Round> {
  speaker: Player; // whose turn it is to answer the current card (A starts)
}
export interface G01Result {
  completed: number;
  skipped: number;
  cardIds: string[];
}

const inPack = (setup: G01Setup) => (c: ConversationCard) =>
  setup.packs.includes(c.category as Pack);
const begin = (s: G01State, i: number): G01State => ({ ...s, roundIndex: i, phase: "card" });

export const G01: GameDefinition<ConversationCard, G01Setup, G01State, G01Result> = {
  id: "G01",
  availableCount: (cards, setup) => availableCount(cards, inPack(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, inPack(setup), seen, setup.rounds),
  initialState: (deck, setup) => ({
    ...baseState<ConversationCard, G01Round>("G01", deck, withDefaultAliases(setup.aliases)),
    speaker: "A",
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (s.phase !== "card") return s;
    const turn = { ...s, speaker: other(s.speaker) };
    if (e.type === "NEXT") {
      const card = s.deck[s.roundIndex];
      const rec: G01Round = { roundIndex: s.roundIndex, cardId: card.id, speaker: s.speaker };
      return toRound(
        { ...turn, completedRounds: [...s.completedRounds, rec] },
        s.roundIndex + 1,
        begin,
      );
    }
    if (e.type === "SKIP") return skipRound(turn, begin);
    return s;
  },
  deriveResult: (s) => ({
    completed: s.completedRounds.length,
    skipped: s.skippedRounds.length,
    cardIds: s.completedRounds.map((r) => r.cardId),
  }),
};
