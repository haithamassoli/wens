import assert from "node:assert/strict";
import { test } from "node:test";
import type { G26Card } from "../content/types";
import type { GameMeta } from "../games.ts";
import { card } from "./fixtures.ts";
import { buildPlan, type PlanContext, planMinutes, replacePart, resolvePlan } from "./g26.ts";

const part = (id: string, category: G26Card["category"], minutes: number, mood: string) =>
  card<G26Card>("G26", id, { category, minutes, tags: [mood] });
const game = (id: string, minutes: number, moods: GameMeta["moods"], extra?: Partial<GameMeta>) =>
  ({
    id,
    slug: id,
    name: id,
    tagline: "",
    why: "",
    steps: ["", "", ""],
    minutes,
    rounds: [],
    depth: "light",
    moods,
    requiresTools: false,
    requiresMovement: false,
    devices: 1,
    hue: "#000",
    category: "talk",
    ...extra,
  }) as GameMeta;

const cards = [
  part("G26-001", "opener", 5, "calm"),
  part("G26-002", "opener", 15, "calm"),
  part("G26-003", "opener", 10, "fun"),
  part("G26-004", "closer", 5, "calm"),
  part("G26-005", "closer", 10, "calm"),
  part("G26-006", "closer", 5, "fun"),
];
const games = [
  game("G01", 10, ["talk"]),
  game("G04", 12, ["challenge", "talk"]),
  game("G09", 7, ["challenge", "laugh"]),
  game("G26", 3, ["activity"]),
  game("G35", 5, ["talk"], { gated: "religious" }),
];
const ctx = (budget: PlanContext["budget"], mood: PlanContext["mood"]): PlanContext => ({
  cards,
  games,
  budget,
  mood,
});
const seeded = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

test("a plan has an opener, a game and a closer of the chosen mood within the budget", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const c = ctx(30, "calm");
    const plan = buildPlan(c, seeded(seed));
    assert.ok(plan);
    const r = resolvePlan(plan, cards, games);
    assert.ok(r);
    assert.equal(r.opener.category, "opener");
    assert.equal(r.closer.category, "closer");
    assert.ok(r.opener.tags.includes("calm") && r.closer.tags.includes("calm"));
    assert.ok(r.game.moods.includes("talk"));
    assert.ok(planMinutes(r) <= 30, `total ${planMinutes(r)} > 30`);
  }
});

test("the planner itself and gated games are never suggested; nothing fits → null", () => {
  const plan = buildPlan(ctx(90, "calm"), seeded(3));
  assert.ok(plan && plan.game !== "G26" && plan.game !== "G35");
  assert.equal(buildPlan({ ...ctx(30, "fun"), games: [game("G01", 60, ["laugh"])] }), null);
  assert.equal(buildPlan({ ...ctx(30, "deep") }), null); // no deep openers in the bank
});

test("replacing one part leaves the other two unchanged and keeps the total in budget", () => {
  const c = ctx(30, "calm");
  const plan = { opener: "G26-001", game: "G01", closer: "G26-004" }; // 5 + 10 + 5
  for (const partName of ["opener", "game", "closer"] as const) {
    for (let seed = 1; seed <= 10; seed++) {
      const next = replacePart(c, plan, partName, seeded(seed));
      assert.notEqual(next[partName], plan[partName]);
      for (const other of ["opener", "game", "closer"] as const)
        if (other !== partName) assert.equal(next[other], plan[other]);
      const r = resolvePlan(next, cards, games);
      assert.ok(r && planMinutes(r) <= 30);
    }
  }
});

test("replacePart returns the same reference when no alternative fits", () => {
  const c = ctx(30, "calm");
  const tight = { opener: "G26-002", game: "G01", closer: "G26-004" }; // 15 + 10 + 5 = 30
  assert.equal(replacePart(c, tight, "game"), tight); // G04 (12) would overflow
  assert.equal(replacePart(c, tight, "closer"), tight); // the 10-minute closer would overflow
  const stale = { opener: "gone", game: "G01", closer: "G26-004" };
  assert.equal(resolvePlan(stale, cards, games), null);
  assert.equal(replacePart(c, stale, "opener"), stale);
});
