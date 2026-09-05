/**
 * Tiny localStorage layer (PRD DATA-02..05, FR-CORE-07).
 *
 * Three keys, each a record with `schemaVersion: 1`:
 *   settings_v1  → { sound, reduceMotion, trackSeen }
 *   favorites_v1 → { games: string[], cards: string[] }
 *   seen_v1      → { games: { [gameId]: { id, at }[] } }
 *
 * Nothing here ever stores names, answers or scores. Every read is guarded:
 * corrupt JSON resets that one key only. When storage is blocked or full the
 * app keeps working from an in-memory mirror for the current page.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

export const STORAGE_KEYS = {
  settings: "settings_v1",
  favorites: "favorites_v1",
  seen: "seen_v1",
} as const;

export interface Settings {
  sound: boolean;
  reduceMotion: boolean;
  trackSeen: boolean;
}

export interface Favorites {
  games: string[];
  cards: string[];
}

interface SeenEntry {
  id: string;
  at: number; // epoch ms
}

interface SettingsRecord extends Settings {
  schemaVersion: 1;
}
interface FavoritesRecord extends Favorites {
  schemaVersion: 1;
}
interface SeenRecord {
  schemaVersion: 1;
  games: Record<string, SeenEntry[]>;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  sound: false,
  reduceMotion: false,
  trackSeen: true,
});
export const DEFAULT_FAVORITES: Readonly<Favorites> = Object.freeze({ games: [], cards: [] });

export const SEEN_CAP_PER_GAME = 200;
export const SEEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Raw access with graceful fallback                                    */
/* ------------------------------------------------------------------ */

const memory = new Map<string, string>();
let availability: boolean | null = null;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** Feature-detects localStorage by writing and removing a probe key. */
export function storageAvailable(): boolean {
  if (!hasWindow()) return false;
  if (availability !== null) return availability;
  try {
    const probe = "__wens_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    availability = true;
  } catch {
    availability = false;
  }
  return availability;
}

function rawGet(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    /* blocked: fall through to memory */
  }
  return memory.get(key) ?? null;
}

function rawSet(key: string, value: string): void {
  memory.set(key, value);
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* full or blocked: memory mirror keeps the session working */
  }
}

function rawRemove(key: string): void {
  memory.delete(key);
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Parses one key. Corrupt JSON or an unknown schema resets that key only. */
function readRecord<T extends { schemaVersion: 1 }>(
  key: string,
  migrate: (parsed: unknown) => T | null,
): T | null {
  const raw = rawGet(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrate(parsed);
    if (migrated === null) rawRemove(key);
    return migrated;
  } catch {
    rawRemove(key);
    return null;
  }
}

function writeRecord(key: string, record: { schemaVersion: 1 }): void {
  rawSet(key, JSON.stringify(record));
  notify();
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/* ------------------------------------------------------------------ */
/* Migrations (explicit, one per key). Version 1 is the only version.   */
/* ------------------------------------------------------------------ */

function migrateSettings(parsed: unknown): SettingsRecord | null {
  if (!isObject(parsed) || parsed.schemaVersion !== 1) return null;
  return {
    schemaVersion: 1,
    sound: typeof parsed.sound === "boolean" ? parsed.sound : DEFAULT_SETTINGS.sound,
    reduceMotion:
      typeof parsed.reduceMotion === "boolean"
        ? parsed.reduceMotion
        : DEFAULT_SETTINGS.reduceMotion,
    trackSeen:
      typeof parsed.trackSeen === "boolean" ? parsed.trackSeen : DEFAULT_SETTINGS.trackSeen,
  };
}

function migrateFavorites(parsed: unknown): FavoritesRecord | null {
  if (!isObject(parsed) || parsed.schemaVersion !== 1) return null;
  if (!isStringArray(parsed.games) || !isStringArray(parsed.cards)) return null;
  return { schemaVersion: 1, games: parsed.games, cards: parsed.cards };
}

function migrateSeen(parsed: unknown): SeenRecord | null {
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !isObject(parsed.games)) return null;
  const games: Record<string, SeenEntry[]> = {};
  for (const [gameId, list] of Object.entries(parsed.games)) {
    if (!Array.isArray(list)) continue;
    games[gameId] = list.filter(
      (e): e is SeenEntry => isObject(e) && typeof e.id === "string" && typeof e.at === "number",
    );
  }
  return { schemaVersion: 1, games };
}

/* ------------------------------------------------------------------ */
/* Settings                                                             */
/* ------------------------------------------------------------------ */

export function readSettings(): Settings {
  const rec = readRecord(STORAGE_KEYS.settings, migrateSettings);
  if (!rec) return { ...DEFAULT_SETTINGS };
  const { schemaVersion: _v, ...settings } = rec;
  return settings;
}

export function writeSettings(next: Partial<Settings>): Settings {
  const merged: Settings = { ...readSettings(), ...next };
  writeRecord(STORAGE_KEYS.settings, { schemaVersion: 1, ...merged });
  return merged;
}

/* ------------------------------------------------------------------ */
/* Favorites                                                            */
/* ------------------------------------------------------------------ */

export function readFavorites(): Favorites {
  const rec = readRecord(STORAGE_KEYS.favorites, migrateFavorites);
  if (!rec) return { games: [], cards: [] };
  return { games: rec.games, cards: rec.cards };
}

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function toggleFavoriteGame(id: string): Favorites {
  const cur = readFavorites();
  const next: Favorites = { ...cur, games: toggleIn(cur.games, id) };
  writeRecord(STORAGE_KEYS.favorites, { schemaVersion: 1, ...next });
  return next;
}

export function toggleFavoriteCard(id: string): Favorites {
  const cur = readFavorites();
  const next: Favorites = { ...cur, cards: toggleIn(cur.cards, id) };
  writeRecord(STORAGE_KEYS.favorites, { schemaVersion: 1, ...next });
  return next;
}

/* ------------------------------------------------------------------ */
/* Seen history (FR-CORE-07): ids only, ≤200 per game, ≤30 days         */
/* ------------------------------------------------------------------ */

function readSeenRecord(): SeenRecord {
  return readRecord(STORAGE_KEYS.seen, migrateSeen) ?? { schemaVersion: 1, games: {} };
}

function prune(entries: SeenEntry[], now: number): SeenEntry[] {
  const fresh = entries.filter((e) => now - e.at <= SEEN_TTL_MS);
  fresh.sort((a, b) => a.at - b.at);
  return fresh.slice(-SEEN_CAP_PER_GAME);
}

/** Ids seen for a game within the last 30 days, oldest first. */
export function readSeen(gameId: string): string[] {
  const rec = readSeenRecord();
  return prune(rec.games[gameId] ?? [], Date.now()).map((e) => e.id);
}

/** Records ids as seen now. No-op when the user disabled tracking. */
export function markSeen(gameId: string, ids: readonly string[]): void {
  if (ids.length === 0) return;
  if (!readSettings().trackSeen) return;
  const now = Date.now();
  const rec = readSeenRecord();
  const existing = (rec.games[gameId] ?? []).filter((e) => !ids.includes(e.id));
  const added = ids.map((id) => ({ id, at: now }));
  rec.games[gameId] = prune([...existing, ...added], now);
  writeRecord(STORAGE_KEYS.seen, rec);
}

export function clearSeen(): void {
  rawRemove(STORAGE_KEYS.seen);
  notify();
}

/** Removes only this app's three keys. Never touches other site storage. */
export function clearAllAppData(): void {
  for (const key of Object.values(STORAGE_KEYS)) rawRemove(key);
  notify();
}

/* ------------------------------------------------------------------ */
/* React bindings                                                       */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>();
let snapshot: { settings?: Settings; favorites?: Favorites } = {};

function notify(): void {
  snapshot = {};
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || (Object.values(STORAGE_KEYS) as string[]).includes(e.key)) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSettingsSnapshot = (): Settings => {
  snapshot.settings ??= readSettings();
  return snapshot.settings;
};
const getFavoritesSnapshot = (): Favorites => {
  snapshot.favorites ??= readFavorites();
  return snapshot.favorites;
};
const getServerSettings = () => DEFAULT_SETTINGS as Settings;
const getServerFavorites = () => DEFAULT_FAVORITES as Favorites;

/** True once the component has mounted on the client (avoids flashing defaults). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** False only when the browser blocks storage; server and first paint assume true. */
export function useStorageAvailable(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => storageAvailable(),
    () => true,
  );
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSettingsSnapshot, getServerSettings);
  const hydrated = useHydrated();
  const update = useCallback((patch: Partial<Settings>) => {
    writeSettings(patch);
  }, []);

  // Mirror the user's reduced-motion setting onto <html> (globals.css reads it).
  useEffect(() => {
    const root = document.documentElement;
    if (settings.reduceMotion) root.setAttribute("data-reduce-motion", "true");
    else root.removeAttribute("data-reduce-motion");
  }, [settings.reduceMotion]);

  return { settings, update, hydrated };
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getFavoritesSnapshot, getServerFavorites);
  const hydrated = useHydrated();
  const toggleGame = useCallback((id: string) => {
    toggleFavoriteGame(id);
  }, []);
  const toggleCard = useCallback((id: string) => {
    toggleFavoriteCard(id);
  }, []);
  const isGameFavorite = useCallback((id: string) => favorites.games.includes(id), [favorites]);
  const isCardFavorite = useCallback((id: string) => favorites.cards.includes(id), [favorites]);
  return { favorites, toggleGame, toggleCard, isGameFavorite, isCardFavorite, hydrated };
}
