import assert from "node:assert/strict";
import { test } from "node:test";
import type { G21Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import {
  G21,
  G21_MAX_QUESTIONS,
  G21_QUESTION_FIELD,
  type G21Category,
  type G21State,
} from "./g21.ts";

const CATS: G21Category[] = ["home", "kitchen", "outdoors", "food"];
const bank = ids(12, "G21").map((id, i) =>
  card<G21Card>("G21", id, { category: CATS[i % 4], body: `كلمة-${i}` }),
);
const ask = { type: "INPUT", field: G21_QUESTION_FIELD, value: "" } as const;
const setup = (rounds: 2 | 4 = 2, categories = CATS) => ({ categories, rounds });
const start = (rounds: 2 | 4 = 2, categories = CATS): G21State =>
  G21.reduce(
    G21.initialState(G21.buildDeck(bank, setup(rounds, categories), []), setup(rounds, categories)),
    {
      type: "START",
    },
  );

test("category filter and round count shape the deck; the chooser alternates", () => {
  assert.equal(G21.availableCount(bank, setup()), 12);
  assert.equal(G21.availableCount(bank, setup(2, ["home"])), 3);
  const s = start(2, ["home", "food"]);
  assert.equal(s.deck.length, 2);
  assert.ok(s.deck.every((c) => ["home", "food"].includes(c.category)));
  assert.equal(s.chooser, "A");
  assert.equal(s.phase, "private_view");
  assert.equal(s.questions, 0);
});

test("the counter stays within 0…20 and UNDO steps back exactly one", () => {
  const ready = G21.reduce(start(), { type: "READY" });
  assert.equal(ready.phase, "playing");

  // Never below zero.
  assert.equal(G21.reduce(ready, { type: "UNDO" }), ready);

  let s = ready;
  for (let i = 0; i < 25; i++) s = G21.reduce(s, ask);
  assert.equal(s.questions, G21_MAX_QUESTIONS);
  assert.equal(G21.reduce(s, ask), s); // clamped at 20

  s = G21.reduce(s, { type: "UNDO" });
  assert.equal(s.questions, 19);
  s = G21.reduce(s, ask);
  assert.equal(s.questions, 20);
});

test("counting is rejected outside the playing phase", () => {
  const hidden = start();
  assert.equal(G21.reduce(hidden, ask), hidden); // still the chooser's private view
  assert.equal(G21.reduce(hidden, { type: "CORRECT" }), hidden);
  const revealed = run<G21State>(G21.reduce, hidden, [{ type: "READY" }, ask, { type: "CORRECT" }]);
  assert.equal(revealed.phase, "reveal");
  assert.equal(G21.reduce(revealed, ask), revealed);
  assert.equal(G21.reduce(revealed, { type: "UNDO" }), revealed);
});

test("the word stays out of every record: only ids, the verdict and the count are kept", () => {
  const s = run<G21State>(G21.reduce, start(), [
    { type: "READY" },
    ask,
    ask,
    ask,
    { type: "CORRECT" },
  ]);
  const round = s.completedRounds[0];
  assert.deepEqual(Object.keys(round).sort(), [
    "cardId",
    "chooser",
    "guessed",
    "questions",
    "roundIndex",
  ]);
  assert.equal(round.questions, 3);
  const serialized = JSON.stringify({ round, result: G21.deriveResult(s) });
  for (const c of s.deck) assert.ok(!serialized.includes(c.body), `leaked ${c.body}`);
});

test("each round records guessed? and the questions used", () => {
  const s = run<G21State>(G21.reduce, start(), [
    { type: "READY" },
    ask,
    ask,
    ask,
    ask,
    { type: "CORRECT" }, // A hid the word, guessed in 4
    { type: "NEXT" },
    { type: "READY" },
    ...Array.from({ length: G21_MAX_QUESTIONS }, () => ask),
    { type: "WRONG" }, // B hid the word, not guessed in 20
  ]);
  assert.equal(s.phase, "reveal");
  assert.deepEqual(
    s.completedRounds.map((r) => [r.chooser, r.guessed, r.questions]),
    [
      ["A", true, 4],
      ["B", false, 20],
    ],
  );
  const done = G21.reduce(s, { type: "NEXT" });
  assert.equal(done.phase, "results");
  assert.deepEqual(G21.deriveResult(done), {
    completed: 2,
    skipped: 0,
    guessed: 1,
    questions: 24,
    averageQuestions: 12,
  });
});
