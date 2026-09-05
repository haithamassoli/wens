import assert from "node:assert/strict";
import { test } from "node:test";
import type { G06Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G06, G06_ROUNDS } from "./g06.ts";

const bank = [
  ...ids(7, "B").map((id) => card<G06Card>("G06", id, { category: "beginnings" })),
  ...ids(4, "T").map((id) => card<G06Card>("G06", id, { category: "travel" })),
  ...ids(4, "F").map((id) => card<G06Card>("G06", id, { category: "funny" })),
];
const setup = { packs: ["beginnings" as const, "travel" as const] };
const start = () =>
  G06.reduce(G06.initialState(G06.buildDeck(bank, setup, []), setup), { type: "START" });

test("only the chosen theme packs are dealt, five distinct cards", () => {
  assert.equal(G06.availableCount(bank, setup), 11);
  assert.equal(G06.availableCount(bank, { packs: ["funny"] }), 4);
  const s = start();
  assert.equal(s.phase, "card");
  assert.equal(s.deck.length, G06_ROUNDS);
  assert.equal(new Set(s.deck.map((c) => c.id)).size, G06_ROUNDS);
  assert.ok(s.deck.every((c) => c.category === "beginnings" || c.category === "travel"));
});

test("a pack with fewer than five cards deals only what exists", () => {
  const few = { packs: ["funny" as const] };
  const s = G06.initialState(G06.buildDeck(bank, few, []), few);
  assert.equal(s.deck.length, 4);
});

test("NEXT and SKIP each consume one slot; the result carries no accuracy score", () => {
  const s = run(G06.reduce, start(), [
    { type: "NEXT" },
    { type: "SKIP" },
    { type: "NEXT" },
    { type: "NEXT" },
    { type: "NEXT" },
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.ended, true);
  assert.equal(s.endedEarly, false);
  const r = G06.deriveResult(s);
  assert.deepEqual(Object.keys(r).sort(), ["cardIds", "completed", "skipped"]);
  assert.equal(r.completed, 4);
  assert.equal(r.skipped, 1);
  assert.equal(r.cardIds.length, 4);
  assert.equal(G06.reduce(s, { type: "NEXT" }), s);
});

test("invalid events keep the same reference; END summarizes what is complete", () => {
  const s0 = G06.initialState(G06.buildDeck(bank, setup, []), setup);
  assert.equal(G06.reduce(s0, { type: "NEXT" }), s0);
  assert.equal(G06.reduce(s0, { type: "INPUT", field: "title", value: "x" }), s0);
  const s = run(G06.reduce, start(), [{ type: "NEXT" }, { type: "NEXT" }, { type: "END" }]);
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, true);
  assert.equal(G06.deriveResult(s).completed, 2);
});
