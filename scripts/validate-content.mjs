// Validates content/*.json against the schema in lib/content/types.ts (PRD §7).
// Plain Node, no dependencies. Exits 1 on any error.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

const GAME_IDS = new Set([
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
  "G16",
  "G17",
  "G18",
  "G19",
  "G20",
  "G21",
  "G22",
  "G23",
  "G24",
  "G25",
  "G26",
  "G27",
  "G28",
  "G29",
  "G30",
  "G31",
  "G32",
  "G33",
  "G34",
  "G35",
  "G36",
]);
const STATUSES = new Set(["draft", "review", "published", "archived"]);
const DEPTHS = new Set(["light", "deep"]);
const G01_CATEGORIES = new Set(["light", "memories", "dreams", "deeper"]);
const G05_CATEGORIES = new Set(["daily", "feelings", "us", "future"]);
const G06_CATEGORIES = new Set(["beginnings", "travel", "home", "funny"]);
const G08_CATEGORIES = new Set(["work", "home", "travel", "fantasy"]);
const G09_CATEGORIES = new Set(["verbal", "acting", "movement"]);
const G31_CATEGORIES = new Set(["daily", "support", "growth"]);
const G10_CATEGORIES = new Set(["easy", "medium", "hard"]);
const G11_CATEGORIES = new Set(["food", "home", "nature", "animals", "travel", "daily"]);
const G13_CATEGORIES = new Set(["product", "style", "audience"]);
const G21_CATEGORIES = new Set(["home", "kitchen", "outdoors", "food", "animals", "things"]);
const G25_LOCATIONS = new Set(["indoor", "outdoor", "any"]);
const G25_COST_TIERS = new Set(["free", "low", "flexible"]);
const G24_CATEGORIES = new Set(["logic", "numbers", "words", "riddle"]);
const G36_CATEGORIES = new Set(["family", "neighbours", "community", "home"]);
const G36_COST_TIERS = new Set(["free", "low"]);
const G16_CATEGORIES = new Set(["sandwich", "eggs", "salad", "warm", "sweet", "drink"]);
// Canonical ingredient list — mirrors G16_INGREDIENTS in lib/engine/g16.ts.
const G16_INGREDIENTS = new Set([
  "خبز",
  "جبن",
  "بيض",
  "طماطم",
  "خيار",
  "زيتون",
  "بطاطا",
  "أرز",
  "دجاج",
  "بصل",
  "ثوم",
  "زيت",
  "ليمون",
  "شوفان",
  "حليب",
  "موز",
  "تفاح",
  "عسل",
  "طحين",
  "سكر",
]);
const G27_COSTS = new Set(["free", "low", "medium"]);
const G32_CATEGORIES = new Set(["home", "food", "space", "admin"]);
const G34_CATEGORIES = new Set(["home", "outside", "colours", "details"]);
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
    case "G05":
      if (!G05_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G05 category "${card.category}" not in ${[...G05_CATEGORIES].join("|")}`,
        );
      if ("options" in card) errors.push(`${where}: G05 cards must not have options`);
      if (isNonEmptyString(card.body) && !card.body.trimEnd().endsWith("…"))
        errors.push(`${where}: G05 body must be an unfinished sentence ending in "…"`);
      break;
    case "G06":
      if (!G06_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G06 category "${card.category}" not in ${[...G06_CATEGORIES].join("|")}`,
        );
      if ("options" in card) errors.push(`${where}: G06 cards must not have options`);
      break;
    case "G07":
      if (card.category !== "prompt") errors.push(`${where}: G07 category must be "prompt"`);
      break;
    case "G08":
      if (!G08_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G08 category "${card.category}" not in ${[...G08_CATEGORIES].join("|")}`,
        );
      if (
        !isStringArray(card.followUps) ||
        card.followUps.length !== 3 ||
        !card.followUps.every(isNonEmptyString)
      ) {
        errors.push(`${where}: followUps must be exactly 3 non-empty strings`);
      } else if (new Set(card.followUps).size !== 3) {
        errors.push(`${where}: followUps must be distinct`);
      }
      break;
    case "G10":
      if (!G10_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G10 category "${card.category}" not in ${[...G10_CATEGORIES].join("|")}`,
        );
      if (card.requiresMovement !== true)
        errors.push(`${where}: G10 cards are acted out; requiresMovement must be true`);
      break;
    case "G11":
      if (!G11_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G11 category "${card.category}" not in ${[...G11_CATEGORIES].join("|")}`,
        );
      if (
        !isStringArray(card.forbidden) ||
        card.forbidden.length !== 3 ||
        !card.forbidden.every(isNonEmptyString)
      ) {
        errors.push(`${where}: forbidden must be exactly 3 non-empty strings`);
      } else if (new Set(card.forbidden).size !== 3) {
        errors.push(`${where}: forbidden words must be distinct`);
      } else if (card.forbidden.some((w) => w === card.body)) {
        errors.push(`${where}: forbidden must not repeat the target word`);
      }
      break;
    case "G12":
      if (card.category !== "opening") errors.push(`${where}: G12 category must be "opening"`);
      if (isString(card.body) && card.body.trim().split(/\s+/).length !== 5)
        errors.push(`${where}: G12 opening must be exactly five words`);
      break;
    case "G13":
      if (!G13_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G13 category "${card.category}" not in ${[...G13_CATEGORIES].join("|")}`,
        );
      if ("options" in card) errors.push(`${where}: G13 cards must not have options`);
      break;
    case "G14":
      if (!["home", "outing", "choice", "fun"].includes(card.category))
        errors.push(`${where}: G14 category "${card.category}" not in home|outing|choice|fun`);
      break;
    case "G15":
      if (card.category !== "example") errors.push(`${where}: G15 category must be "example"`);
      if (!isNonEmptyString(card.tip)) errors.push(`${where}: tip must be a non-empty string`);
      break;
    case "G16": {
      if (!G16_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G16 category "${card.category}" not in ${[...G16_CATEGORIES].join("|")}`,
        );
      if (!isStringArray(card.ingredients) || card.ingredients.length === 0)
        errors.push(`${where}: ingredients must be a non-empty string array`);
      else {
        const off = card.ingredients.filter((i) => !G16_INGREDIENTS.has(i));
        if (off.length)
          errors.push(`${where}: ingredients not on the canonical list: ${off.join(", ")}`);
        if (new Set(card.ingredients).size !== card.ingredients.length)
          errors.push(`${where}: ingredients must be distinct`);
      }
      if (!isStringArray(card.tools) || !card.tools.every(isNonEmptyString))
        errors.push(`${where}: tools must be a string array`);
      else if (card.requiresTools !== card.tools.length > 0)
        errors.push(`${where}: requiresTools must equal tools.length > 0`);
      if (!isPositiveNumber(card.minutes))
        errors.push(`${where}: minutes must be a positive number`);
      else if (card.minutes !== card.estimatedMinutes)
        errors.push(`${where}: minutes must equal estimatedMinutes`);
      if (
        !isStringArray(card.steps) ||
        card.steps.length < 3 ||
        card.steps.length > 6 ||
        !card.steps.every(isNonEmptyString)
      ) {
        errors.push(`${where}: steps must be 3–6 non-empty strings`);
      }
      if (
        !isStringArray(card.tasks) ||
        card.tasks.length !== 2 ||
        !card.tasks.every(isNonEmptyString)
      ) {
        errors.push(`${where}: tasks must be exactly 2 non-empty strings`);
      }
      break;
    }
    case "G17":
      if (!["objects", "animals", "places", "actions"].includes(card.category))
        errors.push(
          `${where}: G17 category "${card.category}" not in objects|animals|places|actions`,
        );
      if (!isStringArray(card.synonyms) || !card.synonyms.every(isNonEmptyString))
        errors.push(`${where}: synonyms must be a string array of non-empty strings`);
      else if (card.synonyms.includes(card.body))
        errors.push(`${where}: synonyms must not repeat the body`);
      break;
    case "G18":
      checkOptions(card, where, 4);
      if (!isNonEmptyString(card.alt))
        errors.push(`${where}: alt must describe the symbols (non-empty string)`);
      if (!isString(card.hint)) errors.push(`${where}: hint must be a string (may be "")`);
      if (!Array.isArray(card.options) || !card.options.some((o) => o?.id === card.answer))
        errors.push(`${where}: answer "${card.answer}" must be one of the option ids`);
      break;
    case "G19":
      if (!isNonEmptyString(card.title)) errors.push(`${where}: title must be a non-empty string`);
      if (!isNonEmptyString(card.ending))
        errors.push(`${where}: ending must be a non-empty string`);
      if (!Array.isArray(card.locks) || card.locks.length !== 4) {
        errors.push(`${where}: locks must be an array of exactly 4`);
      } else {
        card.locks.forEach((l, i) => {
          for (const k of [
            "title",
            "clueA",
            "clueB",
            "question",
            "hint",
            "solution",
            "explanation",
          ])
            if (!l || !isNonEmptyString(l[k]))
              errors.push(`${where}: locks[${i}].${k} must be a non-empty string`);
          if (!l || !isStringArray(l.answers) || !l.answers.some(isNonEmptyString))
            errors.push(`${where}: locks[${i}].answers needs at least one non-empty string`);
        });
      }
      break;
    case "G20":
      if (card.category !== "object") errors.push(`${where}: G20 category must be "object"`);
      if (!isNonEmptyString(card.emoji)) errors.push(`${where}: emoji must be a non-empty string`);
      else if ([...card.emoji.replace(/\uFE0F/g, "")].length > 4)
        errors.push(`${where}: emoji must be a single symbol`);
      if ("options" in card) errors.push(`${where}: G20 cards must not have options`);
      break;
    case "G21":
      if (!G21_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G21 category "${card.category}" not in ${[...G21_CATEGORIES].join("|")}`,
        );
      if ("options" in card) errors.push(`${where}: G21 cards must not have options`);
      break;
    case "G22":
      if (card.category !== "letter" && card.category !== "category")
        errors.push(`${where}: G22 category must be "letter" | "category"`);
      if (card.category === "letter" && !/^[ء-ي]$/.test(card.body ?? ""))
        errors.push(`${where}: G22 letter body must be a single Arabic letter`);
      break;
    case "G23":
      // items: exactly 4 distinct {id,label}, same shape as options
      checkOptions({ options: card.items }, `${where} (items)`, 4);
      break;
    case "G24":
      checkOptions(card, where, 4);
      if (!Array.isArray(card.options) || !card.options.some((o) => o?.id === card.answer))
        errors.push(`${where}: answer "${card.answer}" must be one of the option ids`);
      if (!isNonEmptyString(card.explanation))
        errors.push(`${where}: explanation must be a non-empty string`);
      if (!G24_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G24 category "${card.category}" not in ${[...G24_CATEGORIES].join("|")}`,
        );
      break;
    case "G26":
      if (card.category !== "opener" && card.category !== "closer")
        errors.push(`${where}: G26 category "${card.category}" not in opener|closer`);
      if (!Number.isInteger(card.minutes) || card.minutes < 5 || card.minutes > 15)
        errors.push(`${where}: minutes must be an integer between 5 and 15`);
      if (!isStringArray(card.tags) || !card.tags.some((t) => ["calm", "fun", "deep"].includes(t)))
        errors.push(`${where}: tags must include a mood (calm|fun|deep)`);
      break;
    case "G27":
      // Seed inspiration only; the couple's own wishes never leave their device.
      if (card.category !== "example") errors.push(`${where}: G27 category must be "example"`);
      if (!G27_COSTS.has(card.cost)) errors.push(`${where}: invalid cost "${card.cost}"`);
      break;
    case "G28":
      if (card.category !== "example")
        errors.push(`${where}: G28 category must be "example" (inspiration prompts only)`);
      break;
    case "G29":
      if (card.category !== "starter")
        errors.push(`${where}: G29 category must be "starter" (letter openings only)`);
      break;
    case "G30":
      if (!["home", "outside", "food", "creative"].includes(card.category))
        errors.push(`${where}: G30 category "${card.category}" not in home|outside|food|creative`);
      if (!["free", "low"].includes(card.costTier))
        errors.push(`${where}: G30 costTier must be "free" or "low"`);
      if (!Number.isInteger(card.minutes) || card.minutes <= 0)
        errors.push(`${where}: minutes must be a positive integer`);
      else if (card.minutes !== card.estimatedMinutes)
        errors.push(`${where}: minutes must equal estimatedMinutes`);
      break;
    case "G31":
      if (!G31_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G31 category "${card.category}" not in ${[...G31_CATEGORIES].join("|")}`,
        );
      if ("options" in card) errors.push(`${where}: G31 cards must not have options`);
      if (isNonEmptyString(card.body) && !card.body.includes("…"))
        errors.push(`${where}: G31 body must be a starter containing "…" to complete aloud`);
      break;
    case "G32":
      if (!G32_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G32 category "${card.category}" not in ${[...G32_CATEGORIES].join("|")}`,
        );
      if (
        !isStringArray(card.steps) ||
        card.steps.length !== 2 ||
        !card.steps.every(isNonEmptyString)
      ) {
        errors.push(`${where}: steps must be exactly 2 non-empty strings (a 2-way split)`);
      }
      break;
    case "G33":
      if (!isNonEmptyString(card.lesson) || card.lesson.length > 600)
        errors.push(`${where}: lesson must be a non-empty string of at most 600 chars`);
      if (!isNonEmptyString(card.exercise))
        errors.push(`${where}: exercise must be a non-empty string`);
      if (!card.question || typeof card.question !== "object") {
        errors.push(`${where}: question must be an object`);
      } else {
        if (!isNonEmptyString(card.question.body))
          errors.push(`${where}: question.body must be a non-empty string`);
        if (!isNonEmptyString(card.question.explanation))
          errors.push(`${where}: question.explanation must be a non-empty string`);
        checkOptions(card.question, `${where}.question`, 4);
        if (
          !Array.isArray(card.question.options) ||
          !card.question.options.some((o) => o?.id === card.question.answer)
        )
          errors.push(`${where}: question.answer must be one of the option ids`);
      }
      break;
    case "G34":
      if (!G34_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G34 category "${card.category}" not in ${[...G34_CATEGORIES].join("|")}`,
        );
      if (!isNonEmptyString(card.hint)) errors.push(`${where}: hint must be a non-empty string`);
      // Photos are taken outside the app: a theme never needs the app to hold a tool.
      if (card.requiresTools !== false)
        errors.push(`${where}: G34 themes must set requiresTools=false`);
      break;
    case "G35":
      if (!["seerah", "quran", "ethics"].includes(card.category))
        errors.push(`${where}: G35 category "${card.category}" not in seerah|quran|ethics`);
      checkOptions(card, where, 4);
      if (!Array.isArray(card.options) || !card.options.some((o) => o?.id === card.answer))
        errors.push(`${where}: answer must be one of the option ids`);
      if (!isNonEmptyString(card.explanation))
        errors.push(`${where}: explanation must be a non-empty string`);
      if (card.status === "published" && !isNonEmptyString(card.source))
        errors.push(`${where}: published G35 cards need a non-empty source`);
      break;
    case "G36":
      if (!G36_CATEGORIES.has(card.category))
        errors.push(
          `${where}: G36 category "${card.category}" not in ${[...G36_CATEGORIES].join("|")}`,
        );
      if (!G36_COST_TIERS.has(card.costTier))
        errors.push(`${where}: G36 costTier must be free|low (got "${card.costTier}")`);
      if (!isPositiveNumber(card.minutes)) errors.push(`${where}: minutes must be positive`);
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
