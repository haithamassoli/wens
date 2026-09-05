import assert from "node:assert/strict";
import { test } from "node:test";
import type { WhichOfUsCard } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G03 } from "./g03.ts";

const bank = ids(6, "G03").map((id) => card<WhichOfUsCard>("G03", id));
const setup = { rounds: 5 as const, aliases: { A: "سارة", B: "خالد" } };
const start = () =>
  G03.reduce(G03.initialState(G03.buildDeck(bank, setup, []), setup), { type: "START" });
const round = (first: "A" | "B", firstChoice: string, secondChoice: string) => {
  const second = first === "A" ? "B" : "A";
  return [
    { type: "SUBMIT", player: first, optionId: firstChoice },
    { type: "LOCK", player: first },
    { type: "READY" },
    { type: "SUBMIT", player: second, optionId: secondChoice },
    { type: "LOCK", player: second },
    { type: "NEXT" },
  ];
};

test("first player alternates each round and aliases are applied", () => {
  let s = start();
  assert.deepEqual(s.aliases, { A: "سارة", B: "خالد" });
  assert.equal(s.firstPlayer, "A");
  assert.equal(s.phase, "player_A_input");
  assert.equal(G03.reduce(s, { type: "SUBMIT", player: "B", optionId: "BOTH" }), s);
  s = run(G03.reduce, s, round("A", "BOTH", "BOTH"));
  assert.equal(s.firstPlayer, "B");
  assert.equal(s.phase, "player_B_input");
  s = run(G03.reduce, s, round("B", "PLAYER_A", "PLAYER_B").slice(0, 3));
  assert.equal(s.phase, "player_A_input");
});

test("BOTH/BOTH matches, BOTH/PLAYER_A does not; unknown option rejected", () => {
  const s = run(G03.reduce, start(), [
    ...round("A", "BOTH", "BOTH"),
    ...round("B", "BOTH", "PLAYER_A"),
  ]);
  assert.deepEqual(
    s.completedRounds.map((r) => r.match),
    [true, false],
  );
  assert.deepEqual(G03.deriveResult(s), { rounds: 2, matches: 1, skipped: 0, matchPercent: 50 });
  assert.equal(G03.reduce(s, { type: "SUBMIT", player: "A", optionId: "NOBODY" }), s);
});
