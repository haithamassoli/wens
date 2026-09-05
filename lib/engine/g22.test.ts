import assert from "node:assert/strict";
import { test } from "node:test";
import type { G22Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G22, type G22Setup, judge, normalizeArabic } from "./g22.ts";

const letters = ["م", "ب", "س", "ك", "ر", "ت"];
const bank = [
  ...ids(6, "L").map((id, i) => card<G22Card>("G22", id, { category: "letter", body: letters[i] })),
  ...ids(3, "C").map((id) => card<G22Card>("G22", id, { category: "category" })),
];
const setup: G22Setup = { letter: "م", categories: ["طعام", "مكان", "شيء في البيت"], rounds: 3 };
const start = () =>
  G22.reduce(G22.initialState(G22.buildDeck(bank, setup, []), setup), { type: "START" });
const write = (values: string[]) =>
  values.map((value, i) => ({ type: "INPUT", field: String(i), value }));

test("normaliser strips diacritics/tatweel, unifies alif/ta marbuta/alif maqsura, trims spaces", () => {
  assert.equal(normalizeArabic("مَعْكَرُونَة"), "معكرونه");
  assert.equal(normalizeArabic("أحمد"), "احمد");
  assert.equal(normalizeArabic("إبراهيم"), "ابراهيم");
  assert.equal(normalizeArabic("آمنة"), "امنه");
  assert.equal(normalizeArabic("مصطفى"), "مصطفي");
  assert.equal(normalizeArabic("مــرآة"), "مراه");
  assert.equal(normalizeArabic("  مدينة   نصر "), "مدينه نصر");
  assert.equal(normalizeArabic("مِرْآة"), normalizeArabic("مرآة"));
});

test("deck: only letter cards, the chosen letter first, cut to the round count", () => {
  assert.equal(G22.availableCount(bank, setup), 6);
  const s = start();
  assert.equal(s.deck.length, 3);
  assert.equal(s.deck[0].body, "م");
  assert.ok(s.deck.every((c) => c.category === "letter"));
  assert.deepEqual(s.categories, setup.categories);
  assert.equal(s.phase, "timer_ready");
  assert.equal(s.writer, "A");
});

test("A writes until LOCK or expiry, handoff, B writes until expiry, then review", () => {
  let s = start();
  assert.equal(G22.reduce(s, { type: "INPUT", field: "0", value: "x" }), s); // timer not started
  s = run(G22.reduce, s, [{ type: "READY", now: 0 }, ...write(["معكرونة", "مأدبا", "مرآة"])]);
  assert.equal(s.phase, "timer_running");
  assert.equal(G22.reduce(s, { type: "LOCK", player: "B" }), s);
  s = G22.reduce(s, { type: "LOCK", player: "A" });
  assert.equal(s.phase, "handoff");
  s = G22.reduce(s, { type: "READY" });
  assert.equal(s.phase, "timer_ready");
  assert.equal(s.writer, "B");
  s = run(G22.reduce, s, [{ type: "READY", now: 100 }, ...write(["مَعكرونه", "", "مكنسة"])]);
  assert.equal(G22.reduce(s, { type: "TICK", now: 59_000 }), s);
  s = G22.reduce(s, { type: "TICK", now: 60_100 }); // expiry locks the answers
  assert.equal(s.phase, "review");
  assert.equal(G22.reduce(s, { type: "INPUT", field: "0", value: "late" }), s);
  assert.deepEqual(s.answers.A, ["معكرونة", "مأدبا", "مرآة"]);
  assert.deepEqual(s.answers.B, ["مَعكرونه", "", "مكنسة"]);
});

test("scoring: 10 unique, 5 matching (after normalisation), 0 blank/rejected; manual toggle wins", () => {
  const s = {
    answers: { A: ["معكرونة", "مأدبا", "مرآة"], B: ["مَعكرونه", "", "مكنسة"] },
    verdicts: { A: [null, null, null], B: [null, null, null] },
  };
  assert.deepEqual(judge(s).points, { A: 5 + 10 + 10, B: 5 + 0 + 10 });
  assert.deepEqual(judge(s).accepted.B, [true, false, true]);
  const rejected = { ...s, verdicts: { A: [null, false, null], B: [null, null, null] } };
  assert.deepEqual(judge(rejected).points, { A: 15, B: 15 });
  const rejectedMatch = { ...s, verdicts: { A: [false, null, null], B: [null, null, null] } };
  assert.equal(judge(rejectedMatch).points.B, 20); // B's answer becomes unique
});

test("review verdict SET, NEXT records the round; skips consume slots; totals from rounds", () => {
  let s = run(G22.reduce, start(), [
    { type: "READY", now: 0 },
    ...write(["ملح", "مكة", "مفتاح"]),
    { type: "LOCK", player: "A" },
    { type: "READY" },
    { type: "READY", now: 0 },
    ...write(["ملح", "", ""]),
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(s.phase, "review");
  assert.equal(G22.reduce(s, { type: "SET", key: "C:0", value: "0" }), s);
  s = G22.reduce(s, { type: "SET", key: "B:0", value: "0" });
  assert.deepEqual(judge(s).points, { A: 30, B: 0 });
  s = G22.reduce(s, { type: "NEXT" });
  assert.equal(s.roundIndex, 1);
  assert.equal(s.phase, "timer_ready");
  assert.equal(s.writer, "A");
  s = run(G22.reduce, s, [{ type: "SKIP" }, { type: "SKIP" }]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G22.deriveResult(s), {
    points: { A: 30, B: 0 },
    completed: 1,
    skipped: 2,
    complete: true,
    winner: "A",
  });
});
