import assert from "node:assert/strict";
import { test } from "node:test";
import type { G12Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G12, G12_MAX_TURNS, storyText } from "./g12.ts";

const bank = ids(5, "G12").map((id) =>
  card<G12Card>("G12", id, { category: "opening", body: `بداية ${id}` }),
);
const start = () =>
  G12.reduce(G12.initialState(G12.buildDeck(bank, {}, []), {}), { type: "START" });
const say = (value: string) => [{ type: "INPUT", field: "text", value }, { type: "NEXT" }];

test("a turn changes only after a non-empty submission (≤120 chars)", () => {
  let s = start();
  assert.equal(s.phase, "input");
  assert.equal(s.turn, "A");
  assert.equal(G12.reduce(s, { type: "NEXT" }), s);
  const blank = G12.reduce(s, { type: "INPUT", field: "text", value: "   " });
  assert.equal(G12.reduce(blank, { type: "NEXT" }), blank);
  assert.equal(G12.reduce(s, { type: "INPUT", field: "text", value: "x".repeat(121) }), s);
  s = run(G12.reduce, s, say("ثم تكلّمت الثلاجة"));
  assert.equal(s.turn, "B");
  assert.deepEqual(s.segments, [{ player: "A", text: "ثم تكلّمت الثلاجة" }]);
  assert.equal(s.draft, "");
});

test("UNDO removes only the latest turn and hands it back to its author", () => {
  let s = run(G12.reduce, start(), [...say("واحد"), ...say("اثنان")]);
  assert.equal(s.turn, "A");
  s = G12.reduce(s, { type: "UNDO" });
  assert.deepEqual(
    s.segments.map((x) => x.text),
    ["واحد"],
  );
  assert.equal(s.turn, "B");
  s = G12.reduce(s, { type: "UNDO" });
  assert.equal(s.segments.length, 0);
  assert.equal(G12.reduce(s, { type: "UNDO" }), s);
});

test("at most 20 turns; DONE finishes (the win) with the whole story; END clears it", () => {
  let s = start();
  assert.equal(G12.reduce(s, { type: "DONE" }), s); // nothing written yet
  for (let i = 0; i < G12_MAX_TURNS; i++) s = run(G12.reduce, s, say(`ك${i}`));
  assert.equal(s.segments.length, G12_MAX_TURNS);
  const full = run(G12.reduce, s, say("زيادة"));
  assert.equal(full.segments.length, G12_MAX_TURNS);
  s = G12.reduce(s, { type: "DONE" });
  assert.equal(s.phase, "results");
  const r = G12.deriveResult(s);
  assert.equal(r.finished, true);
  assert.equal(r.turns, 20);
  assert.ok(r.story.startsWith(`${s.deck[0].body} ك0 ك1`));
  assert.equal(r.story, storyText(s));
  const early = run(G12.reduce, start(), [...say("سرّ"), { type: "END" }]);
  assert.equal(early.segments.length, 0);
  assert.deepEqual(G12.deriveResult(early), { finished: false, turns: 0, story: "" });
});

test("SKIP swaps the opening only while the story is empty", () => {
  let s = start();
  assert.equal(s.deck.length, 3);
  s = G12.reduce(s, { type: "SKIP" });
  assert.equal(s.roundIndex, 1);
  assert.equal(s.phase, "input");
  const written = run(G12.reduce, s, say("كلمة"));
  assert.equal(G12.reduce(written, { type: "SKIP" }), written);
});
