import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConversationCard } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G01 } from "./g01.ts";

const bank = [
  ...ids(6, "L").map((id) => card<ConversationCard>("G01", id, { category: "light" })),
  ...ids(3, "M").map((id) => card<ConversationCard>("G01", id, { category: "memories" })),
];
const setup = { packs: ["light" as const], rounds: 5 as const };
const start = () =>
  G01.reduce(G01.initialState(G01.buildDeck(bank, setup, []), setup), { type: "START" });

test("five-round session shows five distinct cards from the chosen packs", () => {
  const s = start();
  assert.equal(s.phase, "card");
  assert.equal(s.deck.length, 5);
  assert.equal(new Set(s.deck.map((c) => c.id)).size, 5);
  assert.ok(s.deck.every((c) => c.category === "light"));
  assert.equal(G01.availableCount(bank, setup), 6);
});

test("each accepted press advances once; NEXT/SKIP alternate the speaker", () => {
  let s = start();
  assert.equal(s.speaker, "A");
  s = G01.reduce(s, { type: "NEXT" });
  assert.equal(s.roundIndex, 1);
  assert.equal(s.speaker, "B");
  assert.deepEqual(s.completedRounds, [{ roundIndex: 0, cardId: s.deck[0].id, speaker: "A" }]);
  s = G01.reduce(s, { type: "SKIP" });
  assert.equal(s.roundIndex, 2);
  assert.equal(s.speaker, "A");
  assert.deepEqual(s.skippedRounds, [1]);
});

test("session ends in results after the last card; result has no score", () => {
  const s = run(G01.reduce, start(), [
    { type: "NEXT" },
    { type: "NEXT" },
    { type: "SKIP" },
    { type: "NEXT" },
    { type: "NEXT" },
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.ended, true);
  assert.equal(s.endedEarly, false);
  const r = G01.deriveResult(s);
  assert.equal(r.completed, 4);
  assert.equal(r.skipped, 1);
  assert.equal(r.cardIds.length, 4);
  assert.equal(G01.reduce(s, { type: "NEXT" }), s);
});

test("invalid events return the same reference; END summarizes early", () => {
  const s0 = G01.initialState(G01.buildDeck(bank, setup, []), setup);
  assert.equal(G01.reduce(s0, { type: "NEXT" }), s0);
  assert.equal(G01.reduce(s0, { type: "SUBMIT", player: "A", optionId: "x" }), s0);
  const s = run(G01.reduce, start(), [{ type: "NEXT" }, { type: "END" }]);
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, true);
  assert.equal(G01.deriveResult(s).completed, 1);
});
