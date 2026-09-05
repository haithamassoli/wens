import assert from "node:assert/strict";
import { test } from "node:test";
import type { G33Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G33, withDone } from "./g33.ts";

const bank = ids(3, "G33").map((id) =>
  card<G33Card>("G33", id, {
    lesson: "درس",
    exercise: "تمرين",
    question: {
      body: "سؤال",
      options: [
        { id: "a", label: "أ" },
        { id: "b", label: "ب" },
        { id: "c", label: "ج" },
        { id: "d", label: "د" },
      ],
      answer: "b",
      explanation: "شرح",
    },
  }),
);
const setup = { lessonId: "G33-002" };
const start = () =>
  G33.reduce(G33.initialState(G33.buildDeck(bank, setup, []), setup), { type: "START" });

test("the session is exactly the chosen lesson: lesson → exercise → question → explanation", () => {
  let s = start();
  assert.equal(s.deck.length, 1);
  assert.equal(s.deck[0].id, "G33-002");
  assert.equal(s.phase, "card");
  assert.equal(G33.reduce(s, { type: "DONE" }), s);
  s = G33.reduce(s, { type: "NEXT" });
  assert.equal(s.phase, "playing");
  s = G33.reduce(s, { type: "DONE" });
  assert.equal(s.phase, "input");
  assert.equal(G33.reduce(s, { type: "LOCK", player: "A" }), s); // nothing chosen yet
  assert.equal(G33.reduce(s, { type: "SUBMIT", player: "A", optionId: "zz" }), s);
  s = run(G33.reduce, s, [
    { type: "SUBMIT", player: "A", optionId: "b" },
    { type: "LOCK", player: "A" },
  ]);
  assert.equal(s.phase, "reveal");
  s = G33.reduce(s, { type: "NEXT" });
  assert.equal(s.phase, "results");
  assert.deepEqual(G33.deriveResult(s), {
    lessonId: "G33-002",
    exerciseDone: true,
    answered: true,
    correct: true,
  });
});

test("skipping the exercise or the question is recorded, never penalised", () => {
  const s = run(G33.reduce, start(), [
    { type: "NEXT" },
    { type: "SKIP" },
    { type: "SKIP" },
    { type: "NEXT" },
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G33.deriveResult(s), {
    lessonId: "G33-002",
    exerciseDone: false,
    answered: false,
    correct: false,
  });
  const wrong = run(G33.reduce, start(), [
    { type: "NEXT" },
    { type: "DONE" },
    { type: "SUBMIT", player: "B", optionId: "a" },
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(G33.deriveResult(wrong).correct, false);
  assert.equal(G33.deriveResult(wrong).answered, true);
});

test("repeating a lesson never loses progress", () => {
  const once = withDone([], "G33-001");
  const twice = withDone(withDone(once, "G33-002"), "G33-001");
  assert.deepEqual(twice, ["G33-001", "G33-002"]);
  assert.equal(withDone(twice, "G33-002"), twice); // same reference, nothing dropped
});
