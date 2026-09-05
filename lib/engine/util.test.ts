import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConversationCard } from "../content/types";
import { card, ids } from "./fixtures.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, pickDeck, shuffle } from "./util.ts";

const cards = ids(6, "G01").map((id, i) =>
  card<ConversationCard>("G01", id, { status: i === 5 ? "draft" : "published" }),
);

test("pickDeck keeps published cards only", () => {
  const deck = pickDeck(cards, () => true, []);
  assert.equal(deck.length, 5);
  assert.ok(deck.every((c) => c.status === "published"));
  assert.equal(
    availableCount(cards, () => true),
    5,
  );
});

test("pickDeck puts seen cards last and cuts to the requested count", () => {
  const seen = ["G01-001", "G01-002"];
  const deck = pickDeck(cards, () => true, seen, 4);
  assert.equal(deck.length, 4);
  assert.deepEqual(
    deck.slice(0, 3).map((c) => seen.includes(c.id)),
    [false, false, false],
  );
  assert.ok(seen.includes(deck[3].id));
});

test("pickDeck returns fewer than requested when the bank is short", () => {
  assert.equal(pickDeck(cards, () => true, [], 10).length, 5);
  assert.equal(pickDeck(cards, (c) => c.id === "G01-001", [], 5).length, 1);
});

test("shuffle is a permutation and leaves the input untouched", () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, () => 0.5);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), input);
});

test("withDefaultAliases trims, caps at 20 chars, and falls back to defaults", () => {
  assert.deepEqual(withDefaultAliases(), { A: "اللاعب الأول", B: "اللاعب الثاني" });
  assert.deepEqual(withDefaultAliases({ A: "  سارة ", B: "" }), { A: "سارة", B: "اللاعب الثاني" });
  assert.equal(withDefaultAliases({ A: "x".repeat(30) }).A.length, 20);
});
