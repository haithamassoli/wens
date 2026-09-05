import assert from "node:assert/strict";
import { test } from "node:test";
import type { G23Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G23, isPermutation, moveItem, positionsMatched } from "./g23.ts";

const items = (["a", "b", "c", "d"] as const).map((id) => ({ id, label: id }));
const bank = ids(8, "G23").map((id) =>
  card<G23Card>("G23", id, { items: items as unknown as G23Card["items"] }),
);
const setup = { rounds: 4 as const };
const start = () =>
  G23.reduce(G23.initialState(G23.buildDeck(bank, setup, []), setup), { type: "START" });

test("orders must be permutations of the four items; move-up/down swaps neighbours", () => {
  const s = start();
  assert.equal(s.phase, "player_A_input");
  assert.deepEqual(s.orders.A, ["a", "b", "c", "d"]);
  assert.equal(G23.reduce(s, { type: "SET", key: "order", value: ["a", "a", "c", "d"] }), s);
  assert.equal(G23.reduce(s, { type: "SET", key: "order", value: ["a", "b", "c"] }), s);
  assert.equal(G23.reduce(s, { type: "SET", key: "order", value: ["a", "b", "c", "x"] }), s);
  assert.equal(isPermutation(bank[0], ["d", "c", "b", "a"]), true);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 2, -1), ["a", "c", "b", "d"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 1), ["a", "b", "c", "d"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, -1), ["a", "b", "c", "d"]);
});

test("ranker locks → handoff → predictor; the predictor starts from the card order, not the ranker's", () => {
  let s = G23.reduce(start(), { type: "SET", key: "order", value: ["d", "c", "b", "a"] });
  assert.equal(G23.reduce(s, { type: "LOCK", player: "B" }), s);
  s = G23.reduce(s, { type: "LOCK", player: "A" });
  assert.equal(s.phase, "handoff");
  assert.equal(G23.reduce(s, { type: "SET", key: "order", value: ["a", "b", "c", "d"] }), s);
  s = G23.reduce(s, { type: "READY" });
  assert.equal(s.phase, "player_B_input");
  assert.deepEqual(s.orders.B, ["a", "b", "c", "d"]);
  assert.deepEqual(s.orders.A, ["d", "c", "b", "a"]);
});

test("one point per item in the correct position (0–4), to the predictor; ranker alternates", () => {
  let s = run(G23.reduce, start(), [
    { type: "SET", key: "order", value: ["d", "c", "b", "a"] },
    { type: "LOCK", player: "A" },
    { type: "READY" },
    { type: "SET", key: "order", value: ["d", "b", "c", "a"] },
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(s.phase, "reveal");
  assert.equal(s.completedRounds[0].points, 2);
  assert.equal(positionsMatched(["a", "b", "c", "d"], ["d", "c", "b", "a"]), 0);
  assert.equal(positionsMatched(["a", "b", "c", "d"], ["a", "b", "c", "d"]), 4);
  assert.deepEqual(G23.deriveResult(s).points, { A: 0, B: 2 });
  s = G23.reduce(s, { type: "NEXT" });
  assert.equal(s.ranker, "B");
  assert.equal(s.phase, "player_B_input");
});

test("four rounds → results with per-player possible points; skips consume slots; END early", () => {
  let s = start();
  assert.equal(s.deck.length, 4);
  for (let i = 0; i < 4; i++) s = G23.reduce(s, { type: "SKIP" });
  assert.equal(s.phase, "results");
  assert.deepEqual(G23.deriveResult(s), {
    points: { A: 0, B: 0 },
    possible: { A: 8, B: 8 },
    completed: 0,
    skipped: 4,
    complete: true,
    winner: "tie",
  });
  const early = run(G23.reduce, start(), [{ type: "SKIP" }, { type: "END" }]);
  assert.equal(early.endedEarly, true);
  assert.equal(G23.deriveResult(early).winner, null);
});
