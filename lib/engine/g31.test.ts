import assert from "node:assert/strict";
import { test } from "node:test";
import type { G31Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G31, G31_MAX_CARDS, G31_ROUNDS } from "./g31.ts";

const bank = ids(12, "T").map((id) => card<G31Card>("G31", id, { category: "daily" }));
const setup = {};
const start = () =>
  G31.reduce(G31.initialState(G31.buildDeck(bank, setup, []), setup), { type: "START" });

test("two cards, one per person, A first then B", () => {
  const s = start();
  assert.equal(s.phase, "card");
  assert.equal(s.reader, "A");
  assert.ok(s.deck.length >= G31_ROUNDS);
  assert.equal(s.deck.length, G31_MAX_CARDS);
  assert.equal(new Set(s.deck.map((c) => c.id)).size, G31_MAX_CARDS);
  const second = G31.reduce(s, { type: "NEXT" });
  assert.equal(second.reader, "B");
  assert.equal(second.roundIndex, 1);
  assert.notEqual(second.deck[1].id, s.deck[0].id); // two cards, never the same one twice
});

test("«إنهاء» ends the session at any point", () => {
  const s = run(G31.reduce, start(), [{ type: "NEXT" }, { type: "NEXT" }, { type: "END" }]);
  assert.equal(s.phase, "results");
  assert.equal(s.ended, true);
  assert.equal(s.endedEarly, true);
  assert.equal(G31.reduce(s, { type: "NEXT" }), s);
});

test("«بطاقة أخرى» keeps going past the two cards", () => {
  const s = run(G31.reduce, start(), [
    { type: "NEXT" },
    { type: "NEXT" },
    { type: "NEXT" },
    { type: "NEXT" },
  ]);
  assert.equal(s.phase, "card");
  assert.equal(s.roundIndex, 4);
  assert.equal(G31.deriveResult(s).read, 4);
});

test("the result carries a count only — never any of the words said", () => {
  const s = run(G31.reduce, start(), [{ type: "NEXT" }, { type: "SKIP" }, { type: "END" }]);
  const r = G31.deriveResult(s);
  assert.deepEqual(r, { read: 1 });
  assert.deepEqual(Object.keys(r), ["read"]);
  assert.equal(s.skippedRounds.length, 1);
});
