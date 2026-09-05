// Validates content/*.json against the schema in lib/content/types.ts (PRD §7).
// Plain Node, no dependencies. Exits 1 on any error.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

const GAME_IDS = new Set(["G01", "G02", "G03", "G04", "G09", "G25"]);
const STATUSES = new Set(["draft", "review", "published", "archived"]);
const DEPTHS = new Set(["light", "deep"]);
const G01_CATEGORIES = new Set(["light", "memories", "dreams", "deeper"]);
const G09_CATEGORIES = new Set(["verbal", "acting", "movement"]);
const G25_LOCATIONS = new Set(["indoor", "outdoor", "any"]);
const G25_COST_TIERS = new Set(["free", "low", "flexible"]);
const ID_PATTERN = /^(G\d{2})-\d{3}$/;

const errors = [];
const seenIds = new Map();
const publishedByGame = new Map();

const isString = (v) => typeof v === "string";
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const isBool = (v) => typeof v === "boolean";
const isPositiveNumber = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const isStringArray = (v) => Array.isArray(v) && v.every(isString);

function checkOptions(card, where, expectedLength) {
  const opts = card.options;
  if (!Array.isArray(opts) || opts.length !== expectedLength) {
    errors.push(`${where}: options must be an array of exactly ${expectedLength}`);
    return;
  }
  const ids = new Set();
  const labels = new Set();
  opts.forEach((opt, i) => {
    if (!opt || typeof opt !== "object") {
      errors.push(`${where}: options[${i}] must be an object`);
      return;
    }
    if (!isNonEmptyString(opt.id) || !/^[a-z0-9_]+$/.test(opt.id)) {
      errors.push(`${where}: options[${i}].id must be a non-empty ascii id (a-z, 0-9, _)`);
    }
    if (!isNonEmptyString(opt.label))
      errors.push(`${where}: options[${i}].label must be a non-empty string`);
    ids.add(opt.id);
    labels.add(opt.label);
  });
  if (ids.size !== opts.length) errors.push(`${where}: option ids must be distinct`);
  if (labels.size !== opts.length) errors.push(`${where}: option labels must be distinct`);
}

function checkBase(card, where, fileGameId) {
  if (!isNonEmptyString(card.id)) {
    errors.push(`${where}: missing id`);
  } else {
    const match = ID_PATTERN.exec(card.id);
    if (!match) errors.push(`${where}: id "${card.id}" must match G##-###`);
    else if (match[1] !== card.gameId)
      errors.push(`${where}: id prefix "${match[1]}" does not match gameId "${card.gameId}"`);
    if (seenIds.has(card.id))
      errors.push(`${where}: duplicate id "${card.id}" (also in ${seenIds.get(card.id)})`);
    else seenIds.set(card.id, where);
  }
  if (!GAME_IDS.has(card.gameId)) errors.push(`${where}: invalid gameId "${card.gameId}"`);
  else if (fileGameId && card.gameId !== fileGameId)
    errors.push(`${where}: gameId "${card.gameId}" does not match file game "${fileGameId}"`);
  if (card.locale !== "ar") errors.push(`${where}: locale must be "ar"`);
  if (!Number.isInteger(card.version) || card.version < 1)
    errors.push(`${where}: version must be a positive integer`);
  if (!STATUSES.has(card.status)) errors.push(`${where}: invalid status "${card.status}"`);
  if (!isNonEmptyString(card.category))
    errors.push(`${where}: category must be a non-empty string`);
  if (!DEPTHS.has(card.depth)) errors.push(`${where}: invalid depth "${card.depth}"`);
  if (!isNonEmptyString(card.body)) errors.push(`${where}: body must be a non-empty string`);
  if (!isStringArray(card.tags) || card.tags.length === 0)
    errors.push(`${where}: tags must be a non-empty string array`);
  if (!isBool(card.requiresMovement)) errors.push(`${where}: requiresMovement must be boolean`);
  if (!isBool(card.requiresTools)) errors.push(`${where}: requiresTools must be boolean`);
  if (!isPositiveNumber(card.estimatedMinutes))
    errors.push(`${where}: estimatedMinutes must be a positive number`);
  if (!isString(card.reviewedAt) || Number.isNaN(Date.parse(card.reviewedAt)))
    errors.push(`${where}: reviewedAt must be an ISO date`);
}

function checkGameSpecific(card, where) {
  switch (card.gameId) {
    case "G01":
      if (!G01_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G01 category "${card.category}" not in ${[...G01_CATEGORIES].join("|")}`,
        );
      if ("options" in card) errors.push(`${where}: G01 cards must not have options`);
      break;
    case "G02":
      checkOptions(card, where, 2);
      break;
    case "G03":
      if ("options" in card)
        errors.push(`${where}: G03 cards must not have options (implicit PLAYER_A|PLAYER_B|BOTH)`);
      break;
    case "G04":
      checkOptions(card, where, 4);
      break;
    case "G09":
      if (!G09_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G09 category "${card.category}" not in ${[...G09_CATEGORIES].join("|")}`,
        );
      if (card.durationSeconds !== 30 && card.durationSeconds !== 60)
        errors.push(`${where}: durationSeconds must be 30 or 60`);
      if (
        !isStringArray(card.steps) ||
        card.steps.length < 1 ||
        card.steps.length > 3 ||
        !card.steps.every(isNonEmptyString)
      ) {
        errors.push(`${where}: steps must be 1–3 non-empty strings`);
      }
      if (!isString(card.alternative))
        errors.push(`${where}: alternative must be a string (may be "")`);
      if (card.category === "movement" && card.requiresMovement !== true)
        errors.push(`${where}: movement cards must set requiresMovement=true`);
      if (card.category === "verbal" && card.requiresMovement !== false)
        errors.push(`${where}: verbal cards must set requiresMovement=false`);
      break;
    case "G25":
      if (!G25_LOCATIONS.has(card.location))
        errors.push(`${where}: invalid location "${card.location}"`);
      if (!G25_COST_TIERS.has(card.costTier))
        errors.push(`${where}: invalid costTier "${card.costTier}"`);
      if (!isPositiveNumber(card.minMinutes) || !isPositiveNumber(card.maxMinutes))
        errors.push(`${where}: minMinutes/maxMinutes must be positive numbers`);
      else if (card.minMinutes > card.maxMinutes)
        errors.push(`${where}: minMinutes must be <= maxMinutes`);
      if (!isStringArray(card.materials) || !card.materials.every(isNonEmptyString))
        errors.push(`${where}: materials must be a string array`);
      else if (card.requiresTools !== card.materials.length > 0)
        errors.push(`${where}: requiresTools must equal materials.length > 0`);
      break;
    default:
      break;
  }
}

const files = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();
if (files.length === 0) errors.push(`no JSON files found in ${CONTENT_DIR}`);

for (const file of files) {
  let cards;
  try {
    cards = JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
  } catch (err) {
    errors.push(`${file}: invalid JSON (${err.message})`);
    continue;
  }
  if (!Array.isArray(cards)) {
    errors.push(`${file}: top-level value must be an array`);
    continue;
  }
  const fileGameId = /^(g\d{2})\.json$/i.test(file) ? file.slice(0, 3).toUpperCase() : null;
  cards.forEach((card, i) => {
    const where = `${file}[${i}]${card?.id ? ` (${card.id})` : ""}`;
    if (!card || typeof card !== "object") {
      errors.push(`${where}: card must be an object`);
      return;
    }
    checkBase(card, where, fileGameId);
    checkGameSpecific(card, where);
    if (card.status === "published" && GAME_IDS.has(card.gameId)) {
      publishedByGame.set(card.gameId, (publishedByGame.get(card.gameId) ?? 0) + 1);
    }
  });
}

console.log("Published cards per game:");
for (const gameId of [...GAME_IDS].sort()) {
  console.log(`  ${gameId}: ${publishedByGame.get(gameId) ?? 0}`);
}
console.log(`  total: ${[...publishedByGame.values()].reduce((a, b) => a + b, 0)}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} content error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\nContent OK.");
