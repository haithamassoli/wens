import assert from "node:assert/strict";
import { test } from "node:test";
import type { G08Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G08, G08_ROUNDS } from "./g08.ts";

const bank = ids(6, "S").map((id) =>
  card<G08Card>("G08", id, {
    category: "work",
    followUps: [`${id}-q1`, `${id}-q2`, `${id}-q3`],
  }),
);
const setup = {};
const start = () =>
  G08.reduce(G08.initialState(G08.buildDeck(bank, setup, []), setup), { type: "START" });

test("three scenarios per session, each opening on its first follow-up", () => {
  assert.equal(G08.availableCount(bank, setup), 6);
  const s = start();
  assert.equal(s.deck.length, G08_ROUNDS);
  assert.equal(new Set(s.deck.map((c) => c.id)).size, G08_ROUNDS);
  assert.equal(s.phase, "card");
  assert.equal(s.stepIndex, 0);
});

test("the premise stays fixed while the three follow-ups are stepped through", () => {
  let s = start();
  const premise = s.deck[0];
  s = G08.reduce(s, { type: "NEXT" });
  assert.equal(s.stepIndex, 1);
  assert.equal(s.deck[s.roundIndex], premise);
  assert.equal(s.completedRounds.length, 0);
  s = G08.reduce(s, { type: "NEXT" });
  assert.equal(s.stepIndex, 2);
  assert.equal(s.deck[s.roundIndex], premise);
  s = G08.reduce(s, { type: "NEXT" }); // the third «اتفقنا» closes the scenario
  assert.equal(s.roundIndex, 1);
  assert.equal(s.stepIndex, 0);
  assert.deepEqual(s.completedRounds, [{ roundIndex: 0, cardId: premise.id }]);
  assert.notEqual(s.deck[1].id, premise.id);
});

test("«بطاقة أخرى» replaces the whole group, mid-way through, and counts as a skip", () => {
  const midway = G08.reduce(start(), { type: "NEXT" });
  assert.equal(midway.stepIndex, 1);
  const redrawn = G08.reduce(midway, { type: "SKIP" });
  assert.equal(redrawn.roundIndex, 1);
  assert.equal(redrawn.stepIndex, 0); // restarts at the first follow-up of a new premise
  assert.notEqual(redrawn.deck[redrawn.roundIndex].id, midway.deck[0].id);
  assert.deepEqual(redrawn.skippedRounds, [0]);
  assert.equal(redrawn.completedRounds.length, 0);
});

test("cooperative result: counts only, no score; END summarizes early", () => {
  const agreed = Array.from({ length: 9 }, () => ({ type: "NEXT" }));
  const s = run(G08.reduce, start(), agreed);
  assert.equal(s.phase, "results");
  assert.deepEqual(G08.deriveResult(s), { completed: 3, skipped: 0 });
  assert.equal(G08.reduce(s, { type: "NEXT" }), s);
  const early = run(G08.reduce, start(), [{ type: "NEXT" }, { type: "END" }]);
  assert.equal(early.endedEarly, true);
  assert.deepEqual(G08.deriveResult(early), { completed: 0, skipped: 0 });
});
