import assert from "node:assert/strict";
import { test } from "node:test";
import type { G15Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G15, normalizeCode, pathValid, playerView, type Station, stationErrors } from "./g15.ts";

const bank = ids(3, "G15").map((id) => card<G15Card>("G15", id, { tip: "t" }));
const stations: Station[] = [
  { hint: "عند الأحذية", code: "AB12", extraHint: "قرب الباب" },
  { hint: "في المطبخ", code: "قهوة", extraHint: "" },
  { hint: "تحت الوسادة", code: "nom42", extraHint: "الجهة اليمنى" },
  { hint: "خلف الصورة", code: "٣٤٥", extraHint: "" },
  { hint: "في الثلاجة", code: "kNz", extraHint: "" },
];
const setup = { stations };
const start = () =>
  G15.reduce(G15.initialState(G15.buildDeck(bank, setup, []), setup), { type: "START" });
const enter = (code: string) => [{ type: "INPUT", field: "code", value: code }, { type: "DONE" }];

test("player-facing projection carries hints only, never a code", () => {
  const view = playerView(stations);
  assert.equal(view.length, 5);
  const text = JSON.stringify(view);
  for (const st of stations) assert.ok(!text.includes(st.code), `leaked ${st.code}`);
  assert.equal(view[0].hint, "عند الأحذية");
});

test("codes match case-, diacritics- and whitespace-insensitively", () => {
  assert.equal(normalizeCode("  Ab12 "), "ab12");
  assert.equal(normalizeCode("قَهْوَة"), "قهوة");
  assert.equal(normalizeCode("٣٤٥"), "345");
  let s = start();
  assert.equal(s.phase, "input");
  s = run(G15.reduce, s, enter("xx"));
  assert.equal(s.wrong, true);
  assert.equal(s.station, 0);
  s = run(G15.reduce, s, enter(" ab12 "));
  assert.equal(s.station, 1);
  assert.equal(s.wrong, false);
  s = run(G15.reduce, s, enter("قَهوة"));
  assert.equal(s.station, 2);
});

test("extra hint is free: result identical with or without it", () => {
  const plain = run(G15.reduce, start(), enter("AB12"));
  const hinted = run(G15.reduce, start(), [{ type: "HINT" }, ...enter("AB12")]);
  assert.equal(hinted.completedRounds[0].extraHintUsed, true);
  assert.deepEqual(G15.deriveResult(hinted), G15.deriveResult(plain));
  const noExtra = run(G15.reduce, start(), enter("AB12"));
  assert.equal(G15.reduce(noExtra, { type: "HINT" }), noExtra); // station 2 has no extra hint
});

test("full path → completed; skips count separately and never penalise", () => {
  const s = run(G15.reduce, start(), [
    ...enter("ab12"),
    ...enter("قهوة"),
    { type: "SKIP" },
    ...enter("345"),
    ...enter("KNZ"),
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G15.deriveResult(s), { solved: 4, skipped: 1, total: 5, completed: false });
  assert.equal(G15.reduce(s, { type: "DONE" }), s);
  const early = run(G15.reduce, start(), [...enter("ab12"), { type: "END" }]);
  assert.equal(early.endedEarly, true);
  assert.equal(G15.deriveResult(early).solved, 1);
});

test("station validation: hint ≤120, code 3–6 letters/digits", () => {
  assert.deepEqual(stationErrors(stations[0]), []);
  assert.equal(stationErrors({ hint: "", code: "ab1", extraHint: "" }).length, 1);
  assert.equal(stationErrors({ hint: "x".repeat(121), code: "ab1", extraHint: "" }).length, 1);
  assert.equal(stationErrors({ hint: "ok", code: "ab", extraHint: "" }).length, 1);
  assert.equal(stationErrors({ hint: "ok", code: "abcdefg", extraHint: "" }).length, 1);
  assert.equal(stationErrors({ hint: "ok", code: "ab-1", extraHint: "" }).length, 1);
  assert.equal(pathValid(stations), true);
  assert.equal(pathValid(stations.slice(0, 4)), false);
});
