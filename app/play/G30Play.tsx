"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G30_CARDS } from "@/lib/content";
import type { G30Card } from "@/lib/content/types";
import {
  addEntry,
  badgesFor,
  type Entry,
  entryError,
  G30,
  type G30Category,
  type G30Setup,
  IMPRESSION_MAX,
  nextBadge,
  removeEntry,
  suggest,
  triedIds,
} from "@/lib/engine/g30";
import { countNoun } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { useGameData, useStorageAvailable } from "@/lib/storage";
import { Instructions } from "./Setup";
import {
  ConfirmDelete,
  DateText,
  Field,
  INPUT_CLASS,
  PrivacyNote,
  StateBadge,
  todayISO,
} from "./shared/album";

const CATEGORIES: [G30Category, string][] = [
  ["home", "في البيت"],
  ["outside", "خارج البيت"],
  ["food", "طعام"],
  ["creative", "إبداع"],
];
const COSTS: [G30Setup["costTier"], string][] = [
  ["any", "لا يهم"],
  ["free", "بلا تكلفة"],
  ["low", "تكلفة بسيطة"],
];
const COST_LABEL: Record<G30Card["costTier"], string> = {
  free: "بلا تكلفة",
  low: "تكلفة بسيطة",
};
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES) as Record<G30Category, string>;

const TRY_FORMS = { one: "تجربة", two: "تجربتان", few: "تجارب", many: "تجربة" };

type Mode = "setup" | "instructions" | "album";

/** G30 — Our First-Time Album (FR-G30): try something new, keep the impression, share nothing. */
export function G30Play({ game }: { game: GameMeta }) {
  const [data, setData, hydrated] = useGameData("G30", { entries: [] as Entry[] });
  const storage = useStorageAvailable();
  const [today] = useState(todayISO);
  const [mode, setMode] = useState<Mode>("setup");
  const [setup, setSetup] = useState<G30Setup>({ categories: [], costTier: "any" });
  const [current, setCurrent] = useState<G30Card | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [writing, setWriting] = useState(false);

  const entries = data.entries;
  const tried = triedIds(entries);
  // Shuffled once per filter change: re-shuffling on every render would reorder the list.
  const deck = useMemo(() => G30.buildDeck(G30_CARDS, setup, []), [setup]);
  const available = G30.availableCount(G30_CARDS, setup);
  const badges = badgesFor(entries.length);
  const next = nextBadge(entries.length);

  const pick = (c: G30Card | null) => {
    setCurrent(c);
    setBrowsing(false);
    setWriting(false);
  };

  const save = (impression: string) => {
    if (!current) return;
    setData((d) => ({ ...d, entries: addEntry(d.entries, current.id, impression, today) }));
    setWriting(false);
    setCurrent(null);
  };

  if (!hydrated)
    return (
      <SessionFrame game={game}>
        <p role="status" className="text-ink-soft">
          نفتح سجلّكما…
        </p>
      </SessionFrame>
    );

  if (mode === "setup")
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">ما نوع التجربة التي تريدانها؟</h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">النوع</legend>
            <div className="flex flex-wrap gap-2">
              <Chip
                pressed={setup.categories.length === 0}
                onToggle={() => setSetup((s) => ({ ...s, categories: [] }))}
                hue={game.hue}
              >
                الكل
              </Chip>
              {CATEGORIES.map(([id, label]) => (
                <Chip
                  key={id}
                  pressed={setup.categories.includes(id)}
                  onToggle={() =>
                    setSetup((s) => ({
                      ...s,
                      categories: s.categories.includes(id)
                        ? s.categories.filter((c) => c !== id)
                        : [...s.categories, id],
                    }))
                  }
                  hue={game.hue}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">التكلفة</legend>
            <div className="flex flex-wrap gap-2">
              {COSTS.map(([id, label]) => (
                <Chip
                  key={id}
                  pressed={setup.costTier === id}
                  onToggle={() => setSetup((s) => ({ ...s, costTier: id }))}
                  hue={game.hue}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <p
            role="status"
            className={available === 0 ? "font-semibold text-danger" : "text-ink-soft"}
          >
            {available === 0 ? (
              "لا اقتراح يطابق هذه الاختيارات. جرّبا تغيير أحدها."
            ) : (
              <>
                <Num value={available} /> اقتراحًا متاحًا.
              </>
            )}
          </p>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              fullWidth
              disabled={available === 0}
              onClick={() => {
                setMode(entries.length === 0 ? "instructions" : "album");
                pick(suggest(deck, tried));
              }}
            >
              ابدآ
            </Button>
            {entries.length > 0 ? (
              <Button variant="secondary" fullWidth onClick={() => setMode("album")}>
                افتحا السجلّ (<Num value={entries.length} />)
              </Button>
            ) : null}
          </div>
        </div>
      </SessionFrame>
    );

  if (mode === "instructions")
    return (
      <SessionFrame game={game}>
        <Instructions game={game} onStart={() => setMode("album")} />
      </SessionFrame>
    );

  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-5">
        {current ? (
          <article
            className="card-in flex flex-col gap-4 rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
            style={{ borderColor: game.hue }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold font-display text-2xl leading-snug">{current.body}</p>
              <FavoriteButton kind="card" id={current.id} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Tag hue={game.hue}>{CATEGORY_LABEL[current.category as G30Category]}</Tag>
              <Tag>{COST_LABEL[current.costTier]}</Tag>
              <Tag>
                <Num value={current.minutes} /> دقيقة
              </Tag>
              {tried.includes(current.id) ? <Tag>جرّبتماها من قبل</Tag> : null}
            </div>

            {writing ? (
              <ImpressionForm onSave={save} onCancel={() => setWriting(false)} />
            ) : (
              <div className="flex flex-col gap-2">
                <Button fullWidth onClick={() => setWriting(true)}>
                  جرّبناها
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => pick(suggest(deck, [...tried, current.id]))}
                >
                  اقتراح آخر
                </Button>
              </div>
            )}
          </article>
        ) : (
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => pick(suggest(deck, tried))}>
              اقترحا علينا تجربة
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          fullWidth
          aria-expanded={browsing}
          onClick={() => setBrowsing((b) => !b)}
        >
          {browsing ? "أخفِ القائمة" : "تصفّحا كل الاقتراحات"}
        </Button>

        {browsing ? (
          <ul className="flex flex-col gap-2">
            {deck.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="flex min-h-11 w-full flex-col gap-1 rounded-card border border-line bg-card p-3 text-right hover:border-ink-faint"
                >
                  <span className="font-medium leading-snug">{c.body}</span>
                  <span className="text-ink-faint text-sm">
                    {CATEGORY_LABEL[c.category as G30Category]} · <Num value={c.minutes} /> دقيقة
                    {tried.includes(c.id) ? " · جرّبتماها" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold font-display text-2xl">سجلّ تجاربكما</h2>
            <p className="text-ink-soft text-sm" aria-live="polite">
              <Num value={entries.length} /> {countNoun(entries.length, TRY_FORMS)}
            </p>
          </div>

          {storage ? null : (
            <p role="status" className="rounded-xl bg-ground-deep p-3 text-danger text-sm">
              الحفظ غير متاح على هذا المتصفح، ولن يبقى السجلّ بعد إغلاق الصفحة.
            </p>
          )}

          {badges.length > 0 ? (
            <ul aria-label="شارات التجارب" className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <li key={b}>
                  <StateBadge tone="open">{b}</StateBadge>
                </li>
              ))}
            </ul>
          ) : null}
          {next ? (
            <p className="text-ink-faint text-sm">
              بقيت <Num value={next.remaining} /> {countNoun(next.remaining, TRY_FORMS)} حتى شارة «
              {next.label}».
            </p>
          ) : null}

          {entries.length === 0 ? (
            <EmptyState
              title="لم تسجّلا تجربة بعد"
              description="اختارا اقتراحًا، جرّباه، ثم اكتبا انطباعكما هنا."
            />
          ) : (
            entries.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onDelete={() => setData((d) => ({ ...d, entries: removeEntry(d.entries, e.id) }))}
              />
            ))
          )}
        </section>

        <div className="mt-auto flex flex-col gap-2">
          <Button variant="ghost" fullWidth onClick={() => setMode("setup")}>
            غيّرا نوع التجربة
          </Button>
          <PrivacyNote>
            السجلّ خاصّ بكما على هذا الجهاز: لا يُنشر شيء تلقائيًا، ولا تُشارَك أيّ شارة.
          </PrivacyNote>
        </div>
      </div>
    </SessionFrame>
  );
}

function EntryRow({ entry, onDelete }: { entry: Entry; onDelete: () => void }) {
  const card = G30_CARDS.find((c) => c.id === entry.cardId);
  return (
    <article className="card-in flex flex-col gap-2 rounded-card bg-card p-4 shadow-[var(--shadow-deck)]">
      <h3 className="font-display font-semibold leading-snug">{card?.body ?? "تجربة محفوظة"}</h3>
      <p className="leading-relaxed">{entry.impression}</p>
      <div className="flex flex-wrap gap-1.5">
        <Tag>
          <DateText iso={entry.date} />
        </Tag>
      </div>
      <div className="flex justify-start">
        <ConfirmDelete question="نحذف هذه التجربة من السجلّ؟" onConfirm={onDelete} />
      </div>
    </article>
  );
}

function ImpressionForm({
  onSave,
  onCancel,
}: {
  onSave: (impression: string) => void;
  onCancel: () => void;
}): ReactNode {
  const [text, setText] = useState("");
  const invalid = entryError(text) !== null;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onSave(text);
      }}
    >
      <Field id="g30-impression" label="انطباعكما" value={text} max={IMPRESSION_MAX}>
        <textarea
          id="g30-impression"
          rows={4}
          value={text}
          maxLength={IMPRESSION_MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder="كيف كانت التجربة؟ جملة واحدة تكفي."
          className={`${INPUT_CLASS} py-3 leading-relaxed`}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Button type="submit" fullWidth disabled={invalid}>
          احفظا في السجلّ
        </Button>
        <Button variant="secondary" fullWidth onClick={onCancel}>
          تراجع
        </Button>
      </div>
    </form>
  );
}
