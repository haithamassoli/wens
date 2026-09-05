import assert from "node:assert/strict";
import { test } from "node:test";
import type { G14Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G14, G14_STARS } from "./g14.ts";

const bank = ids(8, "P").map((id) => card<G14Card>("G14", id, { category: "home" }));
const start = () =>
  G14.reduce(G14.initialState(G14.buildDeck(bank, {}, []), {}), { type: "START" });
const bidRound = (a: number, b: number) => [
  { type: "SET", key: "bid", value: a },
  { type: "LOCK", player: "A" },
  { type: "READY" },
  { type: "SET", key: "bid", value: b },
  { type: "LOCK", player: "B" },
];

test("five items, both start with 100 stars, A bids first", () => {
  const s = start();
  assert.equal(s.deck.length, 5);
  assert.deepEqual(s.balances, { A: G14_STARS, B: G14_STARS });
  assert.equal(s.phase, "player_A_input");
  assert.deepEqual(s.bids, { A: null, B: null });
});

test("rejects bids above the balance, negative or non-integer; LOCK needs a bid", () => {
  const s = start();
  assert.equal(G14.reduce(s, { type: "SET", key: "bid", value: 101 }), s);
  assert.equal(G14.reduce(s, { type: "SET", key: "bid", value: -1 }), s);
  assert.equal(G14.reduce(s, { type: "SET", key: "bid", value: 12.5 }), s);
  assert.equal(G14.reduce(s, { type: "SET", key: "bid", value: "40" }), s);
  assert.equal(G14.reduce(s, { type: "LOCK", player: "A" }), s);
  assert.equal(G14.reduce(s, { type: "LOCK", player: "B" }), s);
  const ok = G14.reduce(s, { type: "SET", key: "bid", value: 100 });
  assert.equal(ok.bids.A, 100);
  // After spending, the ceiling is the remaining balance.
  const later = run(G14.reduce, s, [...bidRound(60, 10), { type: "NEXT" }]);
  assert.equal(later.balances.A, 40);
  assert.equal(G14.reduce(later, { type: "SET", key: "bid", value: 41 }), later);
  assert.equal(G14.reduce(later, { type: "SET", key: "bid", value: 40 }).bids.A, 40);
});

test("highest bidder wins and pays; a repeated LOCK never deducts twice", () => {
  const s = run(G14.reduce, start(), bidRound(30, 45));
  assert.equal(s.phase, "reveal");
  assert.deepEqual(s.balances, { A: 100, B: 55 });
  assert.deepEqual(s.completedRounds, [
    { roundIndex: 0, cardId: s.deck[0].id, winner: "B", price: 45 },
  ]);
  assert.equal(G14.reduce(s, { type: "LOCK", player: "B" }), s);
  assert.equal(G14.reduce(s, { type: "LOCK", player: "A" }), s);
  assert.equal(G14.reduce(s, { type: "SET", key: "bid", value: 5 }), s);
});

test("tie → shared, nothing deducted; bids are dropped at round end", () => {
  const s = run(G14.reduce, start(), bidRound(20, 20));
  assert.deepEqual(s.balances, { A: 100, B: 100 });
  assert.equal(s.completedRounds[0].winner, "shared");
  assert.equal(s.completedRounds[0].price, 0);
  assert.deepEqual(s.bids, { A: 20, B: 20 }); // still shown on the reveal screen
  const next = G14.reduce(s, { type: "NEXT" });
  assert.deepEqual(next.bids, { A: null, B: null });
  assert.equal(next.roundIndex, 1);
  const skipped = G14.reduce(G14.reduce(next, { type: "SET", key: "bid", value: 9 }), {
    type: "SKIP",
  });
  assert.deepEqual(skipped.bids, { A: null, B: null });
  assert.deepEqual(skipped.skippedRounds, [1]);
});

test("B's input phase never sees A's bid change; results recompute stars from rounds", () => {
  const afterA = run(G14.reduce, start(), [
    { type: "SET", key: "bid", value: 10 },
    { type: "LOCK", player: "A" },
  ]);
  assert.equal(afterA.phase, "handoff");
  assert.equal(G14.reduce(afterA, { type: "SET", key: "bid", value: 50 }), afterA);
  const s = run(G14.reduce, start(), [
    ...bidRound(50, 10),
    { type: "NEXT" },
    ...bidRound(0, 0),
    { type: "NEXT" },
    { type: "SKIP" },
    ...bidRound(25, 90),
    { type: "NEXT" },
    { type: "END" },
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, true);
  const r = G14.deriveResult(s);
  assert.deepEqual(r.stars, { A: 50, B: 10 });
  assert.deepEqual(r.stars, s.balances);
  assert.equal(r.won.A.length, 1);
  assert.equal(r.won.B.length, 1);
  assert.equal(r.shared.length, 1);
  assert.equal(r.completed, 3);
  assert.equal(r.skipped, 1);
});
