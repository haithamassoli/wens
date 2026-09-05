import assert from "node:assert/strict";
import { test } from "node:test";
import type { G24Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { daysSinceEpoch, G24, puzzleForDate } from "./g24.ts";

const opts = ["opt1", "opt2", "opt3", "opt4"].map((id) => ({ id, label: id }));
const bank = ids(7, "G24").map((id) =>
  card<G24Card>("G24", id, {
    category: "logic",
    body: `لغز ${id}`,
    options: opts as G24Card["options"],
    answer: "opt2",
    explanation: "لأن كذا.",
  }),
);
bank.push(card<G24Card>("G24", "G24-999", { status: "draft", answer: "opt1" }));

const setupFor = (date: string) => ({ date });
const start = (date: string) => {
  const setup = setupFor(date);
  return G24.reduce(G24.initialState(G24.buildDeck(bank, setup, []), setup), { type: "START" });
};

test("the same local date always yields the same puzzle; drafts never appear", () => {
  assert.equal(daysSinceEpoch("1970-01-01"), 0);
  assert.equal(daysSinceEpoch("1970-01-11"), 10);
  const a = puzzleForDate(bank, "2026-09-05");
  assert.equal(a?.id, puzzleForDate(bank, "2026-09-05")?.id);
  assert.notEqual(a?.id, "G24-999");
  // the bank has 7 published cards, so the puzzle repeats exactly every 7 days
  assert.equal(puzzleForDate(bank, "2026-09-12")?.id, a?.id);
  assert.notEqual(puzzleForDate(bank, "2026-09-06")?.id, a?.id);
  // index = day number modulo the bank size
  assert.equal(a?.id, `G24-${String((daysSinceEpoch("2026-09-05") % 7) + 1).padStart(3, "0")}`);
});

test("a time-zone change cannot hand out a second puzzle for the same local date", () => {
  // whichever local date the device reports, the deck holds exactly that one puzzle
  for (const date of ["2026-09-05", "2026-09-05", "2026-09-05"]) {
    const s = start(date);
    assert.equal(s.deck.length, 1);
    assert.equal(s.deck[0].id, puzzleForDate(bank, date)?.id);
  }
  assert.equal(G24.availableCount(bank, setupFor("2026-09-05")), 1);
});

test("each player proposes secretly; the answer appears only after both locked", () => {
  const s = start("2026-09-05");
  assert.equal(s.phase, "player_A_input");
  // B cannot submit while it is A's turn
  assert.equal(G24.reduce(s, { type: "SUBMIT", player: "B", optionId: "opt1" }), s);
  const afterA = run(G24.reduce, s, [
    { type: "SUBMIT", player: "A", optionId: "opt2" },
    { type: "LOCK", player: "A" },
  ]);
  assert.equal(afterA.phase, "handoff");
  assert.equal(afterA.completedRounds.length, 0); // nothing revealed yet
  const done = run(G24.reduce, afterA, [
    { type: "READY" },
    { type: "SUBMIT", player: "B", optionId: "opt3" },
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(done.phase, "reveal");
  const r = G24.deriveResult(done);
  assert.deepEqual(r, {
    answer: "opt2",
    a: "opt2",
    b: "opt3",
    aCorrect: true,
    bCorrect: false,
    completed: true,
  });
});

test("the single round ends the session; skipping leaves nothing completed", () => {
  const finished = run(G24.reduce, start("2026-09-05"), [
    { type: "SUBMIT", player: "A", optionId: "opt2" },
    { type: "LOCK", player: "A" },
    { type: "READY" },
    { type: "SUBMIT", player: "B", optionId: "opt2" },
    { type: "LOCK", player: "B" },
    { type: "NEXT" },
  ]);
  assert.equal(finished.phase, "results");
  assert.equal(G24.deriveResult(finished).completed, true);

  const skipped = G24.reduce(start("2026-09-05"), { type: "SKIP" });
  assert.equal(skipped.phase, "results");
  assert.equal(G24.deriveResult(skipped).completed, false);
  assert.deepEqual(skipped.skippedRounds, [0]);
});
