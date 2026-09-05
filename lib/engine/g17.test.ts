import assert from "node:assert/strict";
import { test } from "node:test";
import type { G17Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { drawRemainingMs, G17, wordVisible } from "./g17.ts";

const bank = ids(9, "W").map((id) =>
  card<G17Card>("G17", id, { category: "objects", synonyms: [`${id}-alt`] }),
);
const start = () =>
  G17.reduce(G17.initialState(G17.buildDeck(bank, {}, []), {}), { type: "START" });

test("six rounds, the artist alternates starting with A, timer starts on READY", () => {
  let s = start();
  assert.equal(s.deck.length, 6);
  assert.equal(s.phase, "private_view");
  assert.equal(s.artist, "A");
  assert.equal(s.timer, null);
  assert.equal(drawRemainingMs(s, 5_000), 60_000);
  s = G17.reduce(s, { type: "READY", now: 1_000 });
  assert.equal(s.phase, "timer_running");
  assert.equal(drawRemainingMs(s, 31_000), 30_000);
  s = run(G17.reduce, s, [{ type: "CORRECT" }, { type: "NEXT" }]);
  assert.equal(s.roundIndex, 1);
  assert.equal(s.artist, "B");
  assert.equal(s.phase, "private_view");
});

test("the word is visible only while the artist reads it and after the round", () => {
  assert.equal(wordVisible("private_view"), true);
  assert.equal(wordVisible("timer_running"), false);
  assert.equal(wordVisible("timer_paused"), false);
  assert.equal(wordVisible("handoff"), false);
  assert.equal(wordVisible("timer_expired"), true);
  assert.equal(wordVisible("reveal"), true);
});

test("CORRECT scores one point once; it is rejected before READY and after the reveal", () => {
  const s0 = start();
  assert.equal(G17.reduce(s0, { type: "CORRECT" }), s0);
  const s = run(G17.reduce, s0, [{ type: "READY", now: 0 }, { type: "CORRECT" }]);
  assert.equal(s.phase, "reveal");
  assert.deepEqual(s.completedRounds, [
    { roundIndex: 0, cardId: s.deck[0].id, artist: "A", correct: true },
  ]);
  assert.equal(G17.reduce(s, { type: "CORRECT" }), s);
  assert.equal(G17.deriveResult(s).points, 1);
});

test("expiry reveals the word and NEXT records a miss; pause excludes time", () => {
  let s = run(G17.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "PAUSE", now: 10_000 },
    { type: "TICK", now: 70_000 }, // ignored while paused
    { type: "RESUME", now: 20_000 },
  ]);
  assert.equal(s.phase, "timer_running");
  assert.equal(drawRemainingMs(s, 30_000), 40_000);
  s = G17.reduce(s, { type: "TICK", now: 70_000 });
  assert.equal(s.phase, "timer_expired");
  assert.equal(G17.reduce(s, { type: "CORRECT" }), s);
  s = G17.reduce(s, { type: "NEXT" });
  assert.equal(s.roundIndex, 1);
  assert.equal(s.completedRounds[0].correct, false);
});

test("skip is free; result counts points per artist and never from counters", () => {
  const s = run(G17.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "CORRECT" },
    { type: "NEXT" }, // A: 1
    { type: "SKIP" }, // B skipped in private_view
    { type: "READY", now: 0 },
    { type: "TICK", now: 60_000 },
    { type: "NEXT" }, // A: miss
    { type: "READY", now: 0 },
    { type: "SKIP" }, // B skipped mid-timer
    { type: "READY", now: 0 },
    { type: "CORRECT" },
    { type: "NEXT" }, // A: 2
    { type: "READY", now: 0 },
    { type: "CORRECT" },
    { type: "NEXT" }, // B: 1
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, false);
  assert.deepEqual(G17.deriveResult(s), {
    points: 3,
    byArtist: { A: 2, B: 1 },
    completed: 4,
    skipped: 2,
  });
  assert.equal(G17.reduce(s, { type: "NEXT" }), s);
});
