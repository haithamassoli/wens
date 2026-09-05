import assert from "node:assert/strict";
import { test } from "node:test";
import type { G20Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import {
  G20,
  G20_OPTIONS,
  G20_ROUNDS,
  G20_VIEW_MS,
  type G20Level,
  makeGrid,
  playerOfRound,
  viewRemainingMs,
} from "./g20.ts";

const bank = ids(20, "G20").map((id, i) =>
  card<G20Card>("G20", id, { category: "object", body: `شيء ${i}`, emoji: "🔑" }),
);
const setup = { level: 6 as G20Level, wordsOnly: false };
const start = (s = setup) =>
  G20.reduce(G20.initialState(G20.buildDeck(bank, s, []), s), { type: "START" });

test("grids: no duplicate targets and every target is among the options", () => {
  for (const level of [4, 6, 9] as G20Level[]) {
    for (let i = 0; i < 50; i++) {
      const g = makeGrid(bank, level);
      assert.equal(g.targets.length, level);
      assert.equal(new Set(g.targets).size, level, "duplicate target");
      assert.equal(g.options.length, G20_OPTIONS[level]);
      assert.equal(new Set(g.options).size, G20_OPTIONS[level], "duplicate option");
      for (const t of g.targets) assert.ok(g.options.includes(t), "target missing from options");
    }
  }
});

test("four rounds alternate roles and each starts with a fresh grid of the same level", () => {
  const s = start();
  assert.equal(s.grids.length, G20_ROUNDS);
  assert.equal(s.phase, "timer_ready");
  for (const g of s.grids) assert.equal(g.targets.length, setup.level);
  assert.deepEqual([0, 1, 2, 3].map(playerOfRound), ["A", "B", "A", "B"]);
});

test("the grid hides on TICK past the window, and DONE («أخفِ الآن») hides it early", () => {
  const s = start();
  assert.equal(viewRemainingMs(s, 5_000), G20_VIEW_MS);
  const running = G20.reduce(s, { type: "READY", now: 1_000 });
  assert.equal(running.phase, "timer_running");
  assert.equal(viewRemainingMs(running, 4_000), G20_VIEW_MS - 3_000);
  assert.equal(G20.reduce(running, { type: "TICK", now: 1_000 + G20_VIEW_MS - 1 }), running);
  assert.equal(G20.reduce(running, { type: "TICK", now: 1_000 + G20_VIEW_MS }).phase, "input");
  assert.equal(G20.reduce(running, { type: "DONE" }).phase, "input");
  // pausing (hidden tab) does not burn the window
  const paused = G20.reduce(running, { type: "PAUSE", now: 3_000 });
  assert.equal(viewRemainingMs(paused, 60_000), G20_VIEW_MS - 2_000);
  const resumed = G20.reduce(paused, { type: "RESUME", now: 60_000 });
  assert.equal(viewRemainingMs(resumed, 61_000), G20_VIEW_MS - 3_000);
});

test("score = correct − wrong, never below zero", () => {
  const s = run(G20.reduce, start(), [{ type: "READY", now: 0 }, { type: "DONE" }]);
  const grid = s.grids[0];
  const distractors = grid.options.filter((id) => !grid.targets.includes(id));
  const picks = [grid.targets[0], grid.targets[1], ...distractors.slice(0, 3)];
  const locked = run(
    G20.reduce,
    s,
    picks
      .map((optionId) => ({ type: "SUBMIT", player: "A", optionId }))
      .concat([{ type: "DONE" } as never]),
  );
  assert.equal(locked.phase, "reveal");
  const rec = locked.completedRounds[0];
  assert.deepEqual([rec.correct, rec.wrong, rec.score], [2, 3, 0]);
  assert.equal(G20.deriveResult(locked).A, 0);
  // an option outside the list is ignored, and tapping twice deselects
  assert.equal(G20.reduce(s, { type: "SUBMIT", player: "A", optionId: "nope" }), s);
  const once = G20.reduce(s, { type: "SUBMIT", player: "A", optionId: grid.targets[0] });
  assert.deepEqual(
    G20.reduce(once, { type: "SUBMIT", player: "A", optionId: grid.targets[0] }).selected,
    [],
  );
});

test("a whole session scores each player separately; ties are fine", () => {
  let s = start();
  for (let round = 0; round < G20_ROUNDS; round++) {
    const grid = s.grids[round];
    s = run(G20.reduce, s, [{ type: "READY", now: 0 }, { type: "DONE" }]);
    s = run(
      G20.reduce,
      s,
      grid.targets.map((optionId) => ({ type: "SUBMIT", player: "A", optionId })),
    );
    s = run(G20.reduce, s, [{ type: "DONE" }, { type: "NEXT" }]);
  }
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, false);
  const r = G20.deriveResult(s);
  assert.deepEqual(r, { A: setup.level * 2, B: setup.level * 2, rounds: 4, skipped: 0 });
  assert.equal(G20.reduce(s, { type: "NEXT" }), s);
});

test("SKIP consumes the round slot without scoring; END summarises what is complete", () => {
  const skipped = G20.reduce(start(), { type: "SKIP" });
  assert.equal(skipped.roundIndex, 1);
  assert.deepEqual(skipped.skippedRounds, [0]);
  const ended = G20.reduce(skipped, { type: "END" });
  assert.equal(ended.phase, "results");
  assert.equal(ended.endedEarly, true);
  assert.deepEqual(G20.deriveResult(ended), { A: 0, B: 0, rounds: 0, skipped: 1 });
});
