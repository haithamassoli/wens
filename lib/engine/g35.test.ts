import assert from "node:assert/strict";
import { test } from "node:test";
import type { G35Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { answerer, G35, G35_ROUNDS } from "./g35.ts";

const q = (id: string, category: string) =>
  card<G35Card>("G35", id, {
    category,
    options: [
      { id: "a", label: "أ" },
      { id: "b", label: "ب" },
      { id: "c", label: "ج" },
      { id: "d", label: "د" },
    ],
    answer: "a",
    explanation: "شرح",
    source: "مصدر",
  });
const bank = [
  ...ids(6, "S").map((id) => q(id, "seerah")),
  ...ids(4, "Q").map((id) => q(id, "quran")),
  ...ids(3, "E").map((id) => q(id, "ethics")),
  { ...q("D-001", "seerah"), status: "draft" as const },
];
const setup = { categories: ["seerah" as const, "ethics" as const] };
const start = () =>
  G35.reduce(G35.initialState(G35.buildDeck(bank, setup, []), setup), { type: "START" });
const play = (p: "A" | "B", optionId: string) => [
  { type: "SUBMIT", player: p, optionId },
  { type: "LOCK", player: p },
  { type: "NEXT" },
];

test("five published questions from the chosen topics only", () => {
  assert.equal(G35.availableCount(bank, setup), 9);
  assert.equal(G35.availableCount(bank, { categories: ["quran"] }), 4);
  const s = start();
  assert.equal(s.deck.length, G35_ROUNDS);
  assert.ok(s.deck.every((c) => c.category !== "quran" && c.status === "published"));
  assert.equal(new Set(s.deck.map((c) => c.id)).size, 5);
});

test("players alternate; only the answerer's pick counts", () => {
  let s = start();
  assert.equal(answerer(0), "A");
  assert.equal(answerer(1), "B");
  assert.equal(G35.reduce(s, { type: "SUBMIT", player: "B", optionId: "a" }), s);
  assert.equal(G35.reduce(s, { type: "LOCK", player: "A" }), s); // nothing chosen
  s = run(G35.reduce, s, play("A", "a"));
  assert.equal(s.roundIndex, 1);
  assert.equal(G35.reduce(s, { type: "SUBMIT", player: "A", optionId: "a" }), s);
  s = run(G35.reduce, s, [
    { type: "SUBMIT", player: "B", optionId: "c" },
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(s.phase, "reveal");
  assert.equal(s.completedRounds[1].correct, false);
  assert.equal(G35.reduce(s, { type: "SUBMIT", player: "B", optionId: "a" }), s); // locked
});

test("one point per correct answer; skips count separately; END summarises early", () => {
  const s = run(G35.reduce, start(), [
    ...play("A", "a"),
    ...play("B", "b"),
    { type: "SKIP" },
    ...play("B", "a"),
    ...play("A", "a"),
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G35.deriveResult(s), { points: { A: 2, B: 1 }, completed: 4, skipped: 1 });
  const early = run(G35.reduce, start(), [...play("A", "a"), { type: "END" }]);
  assert.equal(early.endedEarly, true);
  assert.deepEqual(G35.deriveResult(early).points, { A: 1, B: 0 });
});
