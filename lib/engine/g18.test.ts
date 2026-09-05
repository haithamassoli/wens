import assert from "node:assert/strict";
import { test } from "node:test";
import type { G18Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G18 } from "./g18.ts";

const opts = (correct: string) =>
  ["opt1", "opt2", "opt3", "opt4"].map((id) => ({ id, label: `${id}-${correct}` }));
const bank = ids(12, "G18").map((id, i) =>
  card<G18Card>("G18", id, {
    body: "☀️🧳✈️",
    alt: "شمس، حقيبة، طائرة",
    options: opts(id) as G18Card["options"],
    answer: "opt2",
    hint: i === 0 ? "الفصل الحارّ" : "",
  }),
);
const setup = { rounds: 5 } as const;
const start = () =>
  G18.reduce(G18.initialState(G18.buildDeck(bank, setup, []), setup), { type: "START" });

test("only the approved option counts; a wrong lock scores nothing", () => {
  const s = start();
  assert.equal(s.deck.length, 5);
  assert.equal(s.phase, "card");
  // an option that is not on the card is ignored
  assert.equal(G18.reduce(s, { type: "SUBMIT", player: "A", optionId: "nope" }), s);
  const wrong = run(G18.reduce, s, [
    { type: "SUBMIT", player: "A", optionId: "opt3" },
    { type: "DONE" },
  ]);
  assert.equal(wrong.phase, "reveal");
  assert.equal(wrong.completedRounds[0].correct, false);
  assert.deepEqual(G18.deriveResult(wrong), {
    solved: 0,
    missed: 1,
    revealed: 0,
    skipped: 0,
    hints: 0,
  });
  const right = run(G18.reduce, s, [
    { type: "SUBMIT", player: "A", optionId: "opt3" },
    { type: "SUBMIT", player: "A", optionId: "opt2" }, // re-picking before locking is allowed
    { type: "DONE" },
  ]);
  assert.equal(right.completedRounds[0].correct, true);
  assert.equal(G18.deriveResult(right).solved, 1);
});

test("REVEAL scores nothing even when the right option was already picked", () => {
  const s = run(G18.reduce, start(), [
    { type: "SUBMIT", player: "A", optionId: "opt2" },
    { type: "REVEAL" },
  ]);
  assert.equal(s.phase, "reveal");
  assert.equal(s.completedRounds[0].revealed, true);
  const r = G18.deriveResult(s);
  assert.equal(r.solved, 0);
  assert.equal(r.revealed, 1);
  assert.equal(r.missed, 0);
});

test("HINT is free: recorded in the result, no effect on the score", () => {
  let s = start();
  const withHint = G18.reduce(s, { type: "HINT" });
  const hasHint = s.deck[0].hint !== "";
  assert.equal(withHint.hinted, hasHint);
  if (!hasHint) assert.equal(withHint, s); // no hint text → the event is a no-op
  s = run(G18.reduce, withHint, [
    { type: "SUBMIT", player: "A", optionId: "opt2" },
    { type: "DONE" },
  ]);
  const r = G18.deriveResult(s);
  assert.equal(r.solved, 1);
  assert.equal(r.hints, hasHint ? 1 : 0);
});

test("DONE without a choice is a no-op; SKIP is free and never scores", () => {
  const s = start();
  assert.equal(G18.reduce(s, { type: "DONE" }), s);
  const skipped = G18.reduce(s, { type: "SKIP" });
  assert.equal(skipped.roundIndex, 1);
  assert.equal(skipped.phase, "card");
  assert.equal(skipped.chosen, null);
  assert.deepEqual(G18.deriveResult(skipped), {
    solved: 0,
    missed: 0,
    revealed: 0,
    skipped: 1,
    hints: 0,
  });
});

test("a full session of five cards ends in results and keeps the score", () => {
  const s = run(G18.reduce, start(), [
    { type: "SUBMIT", player: "A", optionId: "opt2" },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "SUBMIT", player: "A", optionId: "opt1" },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "REVEAL" },
    { type: "NEXT" },
    { type: "SKIP" },
    { type: "SUBMIT", player: "A", optionId: "opt2" },
    { type: "DONE" },
    { type: "NEXT" },
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.ended, true);
  assert.deepEqual(G18.deriveResult(s), {
    solved: 2,
    missed: 1,
    revealed: 1,
    skipped: 1,
    hints: 0,
  });
  assert.equal(G18.reduce(s, { type: "NEXT" }), s);
});
