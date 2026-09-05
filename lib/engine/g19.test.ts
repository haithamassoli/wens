import assert from "node:assert/strict";
import { test } from "node:test";
import type { EscapeLock, G19Card } from "../content/types";
import { card, run } from "./fixtures.ts";
import { currentLock, elapsedMs, G19, normalizeAnswer, progressOf, storyErrors } from "./g19.ts";

const lock = (n: number, answers: string[]): EscapeLock => ({
  title: `قفل ${n}`,
  clueA: `A${n}`,
  clueB: `B${n}`,
  question: `س${n}`,
  answers,
  hint: `تلميح ${n}`,
  solution: answers[0],
  explanation: `شرح ${n}`,
});
const story = card<G19Card>("G19", "G19-001", {
  title: "قصة",
  locks: [lock(1, ["742"]), lock(2, ["الخامسة", "5"]), lock(3, ["بحر"]), lock(4, ["12"])],
  ending: "النهاية",
});
const bank = [story, card<G19Card>("G19", "G19-002", { ...story, id: "G19-002" })];
const setup = { storyId: "G19-001" };
const begin = () =>
  run(G19.reduce, G19.initialState(G19.buildDeck(bank, setup, []), setup), [
    { type: "START" },
    { type: "READY", now: 1_000 },
  ]);
// A reads, hands over, B reads, then both answer.
const readClues = [{ type: "READY" }, { type: "NEXT" }, { type: "READY" }, { type: "NEXT" }];
const answer = (v: string) => [{ type: "INPUT", field: "answer", value: v }, { type: "DONE" }];

test("locks open in order: each from its own clues, never with a later lock's answer", () => {
  let s = begin();
  assert.equal(s.deck.length, 1);
  assert.equal(s.phase, "handoff");
  const answers = ["٧٤٢", "الخامسة", "بحر", "12"];
  for (let i = 0; i < 4; i++) {
    assert.equal(s.lock, i);
    assert.equal(currentLock(s)?.clueA, `A${i + 1}`);
    s = run(G19.reduce, s, readClues);
    assert.equal(s.phase, "input");
    if (i < 3) {
      s = run(G19.reduce, s, answer(answers[i + 1]));
      assert.equal(s.wrong, true, "next lock's answer must not open this one");
    }
    s = run(G19.reduce, s, answer(answers[i]));
    assert.equal(s.phase, "reveal");
    s = G19.reduce(s, { type: "NEXT" });
  }
  assert.equal(s.phase, "results");
  const r = G19.deriveResult(s);
  assert.equal(r.escaped, true);
  assert.equal(r.solved, 4);
  assert.equal(r.hints, 0);
});

test("answers match loosely; hint then reveal are always available and counted only", () => {
  assert.equal(normalizeAnswer(" الخَامِسَة "), normalizeAnswer("الخامسه"));
  assert.equal(normalizeAnswer("رحلة إلى الشمال"), normalizeAnswer("رحلةالىالشمال"));
  let s = run(G19.reduce, begin(), readClues);
  assert.equal(G19.reduce(s, { type: "HINT" }).hintShown, true);
  s = run(G19.reduce, s, [{ type: "HINT" }, { type: "HINT" }]);
  assert.equal(G19.deriveResult(s).hints, 1);
  s = G19.reduce(s, { type: "REVEAL" });
  assert.equal(s.phase, "reveal");
  assert.deepEqual(s.completedRounds, [
    { roundIndex: 0, cardId: "G19-001#1", hintUsed: true, revealed: true },
  ]);
  s = run(G19.reduce, s, [{ type: "NEXT" }, ...readClues, { type: "SKIP" }, { type: "END" }]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G19.deriveResult(s), {
    solved: 1,
    skipped: 1,
    hints: 1,
    reveals: 1,
    elapsedMs: 0,
    escaped: false,
  });
});

test("elapsed time is wall-clock minus pauses; frozen while paused", () => {
  let s = run(G19.reduce, begin(), [{ type: "TICK", now: 11_000 }]);
  assert.equal(elapsedMs(s), 10_000);
  s = G19.reduce(s, { type: "PAUSE", now: 12_000 });
  assert.equal(G19.reduce(s, { type: "READY" }), s); // frozen
  assert.equal(elapsedMs(s, 50_000), 11_000);
  s = G19.reduce(s, { type: "RESUME", now: 20_000 });
  assert.equal(elapsedMs(s, 25_000), 16_000);
});

test("progress resumes the same story at the same lock with counters carried over", () => {
  const before = run(G19.reduce, begin(), [
    ...readClues,
    { type: "HINT" },
    ...answer("742"),
    { type: "NEXT" },
  ]);
  const p = progressOf(before);
  assert.deepEqual(p, {
    storyId: "G19-001",
    lockIndex: 1,
    startedAt: 1_000,
    hintsUsed: 1,
    revealsUsed: 0,
    solved: 1,
    skipped: 0,
  });
  const resumed = G19.reduce(
    G19.initialState(G19.buildDeck(bank, { ...setup, resume: p }, []), { ...setup, resume: p }),
    { type: "START" },
  );
  assert.equal(resumed.phase, "handoff");
  assert.equal(resumed.lock, 1);
  const done = run(G19.reduce, resumed, [
    { type: "TICK", now: 61_000 },
    ...readClues,
    ...answer("5"),
    { type: "NEXT" },
    ...readClues,
    ...answer("بحر"),
    { type: "NEXT" },
    ...readClues,
    ...answer("١٢"),
    { type: "NEXT" },
  ]);
  assert.deepEqual(G19.deriveResult(done), {
    solved: 4,
    skipped: 0,
    hints: 1,
    reveals: 0,
    elapsedMs: 60_000,
    escaped: true,
  });
});

test("storyErrors flags a lock missing a clue or an answer", () => {
  assert.deepEqual(storyErrors(story), []);
  const broken: G19Card = {
    ...story,
    locks: [
      lock(1, ["1"]),
      { ...lock(2, ["2"]), clueB: " ", answers: [" "] },
      lock(3, ["3"]),
      lock(4, ["4"]),
    ],
  };
  assert.deepEqual(storyErrors(broken), [
    "lock 2: clueB missing",
    "lock 2: needs at least one answer",
  ]);
});
