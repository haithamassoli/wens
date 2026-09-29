import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Body,
  bounceOff,
  nearestStar,
  segmentHitsCircle,
  starField,
  stepPuck,
} from "./arcade.ts";

const body = (x: number, y: number, vx = 0, vy = 0, r = 10): Body => ({ x, y, vx, vy, r });

test("segment hits a circle it passes through, misses one beside it", () => {
  assert.ok(segmentHitsCircle(0, 0, 100, 0, 50, 5, 6));
  assert.ok(!segmentHitsCircle(0, 0, 100, 0, 50, 20, 6));
  assert.ok(!segmentHitsCircle(0, 0, 100, 0, 120, 0, 6)); // past the endpoint
  assert.ok(segmentHitsCircle(5, 5, 5, 5, 8, 5, 4)); // zero-length segment
});

test("an approaching puck bounces off a mallet and is pushed out of overlap", () => {
  const puck = body(0, -15, 0, 300);
  assert.ok(bounceOff(puck, body(0, 0, 0, 0, 10)));
  assert.equal(puck.y, -20);
  assert.ok(puck.vy < 0);
  const receding = body(0, -15, 0, -300);
  bounceOff(receding, body(0, 0, 0, 0, 10));
  assert.equal(receding.vy, -300); // already moving away: no extra kick
  assert.ok(!bounceOff(body(0, -50), body(0, 0)));
});

test("puck scores through the mouth and bounces off the wall beside it", () => {
  assert.equal(stepPuck(body(180, 5, 0, -600), 0.02, 360, 600, 70).goal, "A");
  assert.equal(stepPuck(body(180, 595, 0, 600), 0.02, 360, 600, 70).goal, "B");
  const wide = body(20, 12, 0, -600);
  assert.deepEqual(stepPuck(wide, 0.02, 360, 600, 70), { goal: null, wall: "end" });
  assert.ok(wide.vy > 0 && wide.y === wide.r);
});

test("the star field is deterministic, spaced, and tappable", () => {
  const a = starField(7, 60, 360, 600);
  assert.deepEqual(a, starField(7, 60, 360, 600));
  assert.equal(a.length, 60);
  for (const [i, s] of a.entries())
    for (const t of a.slice(i + 1)) assert.ok(Math.hypot(s.x - t.x, s.y - t.y) >= 22);
  assert.equal(nearestStar(a, a[3].x + 4, a[3].y, 12), 3);
  assert.equal(nearestStar([], 0, 0, 12), -1);
});
