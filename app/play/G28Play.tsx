"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { Num } from "@/components/Num";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G28_CARDS } from "@/lib/content";
import {
  addMemory,
  byCity,
  citiesOf,
  groupByYear,
  isAnniversarySoon,
  MEMORY_LIMITS,
  type Memory,
  type MemoryDraft,
  memoryError,
  removeMemory,
} from "@/lib/engine/g28";
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

const ERRORS: Record<NonNullable<ReturnType<typeof memoryError>>, string> = {
  title: "اكتبا عنوانًا قصيرًا للذكرى.",
  date: "اختارا تاريخًا صحيحًا.",
  city: "اكتبا اسم المدينة أو المكان.",
  note: "الملاحظة أطول من المسموح.",
};

const MEMORY_FORMS = { one: "ذكرى", two: "ذكريان", few: "ذكريات", many: "ذكرى" };

const EMPTY: MemoryDraft = { title: "", date: "", city: "", note: "" };

/** G28 — Our Memory Map (FR-G28): a private, device-local album of moments. */
export function G28Play({ game }: { game: GameMeta }) {
  const [data, setData, hydrated] = useGameData("G28", { memories: [] as Memory[] });
  const storage = useStorageAvailable();
  const [today] = useState(todayISO);
  const [intro, setIntro] = useState(true);
  const [adding, setAdding] = useState(false);
  const [city, setCity] = useState<string | null>(null);

  const memories = data.memories;
  const cities = citiesOf(memories);
  const visible = byCity(memories, city !== null && cities.includes(city) ? city : null);
  const years = groupByYear(visible);

  const save = (draft: MemoryDraft) => {
    setData((d) => ({ ...d, memories: addMemory(d.memories, draft) }));
    setAdding(false);
  };
  const remove = (id: string) => setData((d) => ({ ...d, memories: removeMemory(d.memories, id) }));

  if (!hydrated)
    return (
      <SessionFrame game={game}>
        <p role="status" className="text-ink-soft">
          نفتح ألبومكما…
        </p>
      </SessionFrame>
    );

  if (intro && memories.length === 0 && !adding)
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <Instructions game={game} onStart={() => setIntro(false)} />
          <div className="rounded-card bg-card p-5">
            <h2 className="font-bold font-display text-lg">أمثلة تلهمكما</h2>
            <ul className="mt-3 flex flex-col gap-2 text-ink-soft">
              {G28_CARDS.slice(0, 4).map((c) => (
                <li key={c.id}>• {c.body}</li>
              ))}
            </ul>
          </div>
        </div>
      </SessionFrame>
    );

  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-bold font-display text-2xl">ألبومكما</h2>
          <p className="text-ink-soft text-sm" aria-live="polite">
            <Num value={memories.length} /> {countNoun(memories.length, MEMORY_FORMS)}
          </p>
        </div>

        {storage ? null : (
          <p role="status" className="rounded-xl bg-ground-deep p-3 text-danger text-sm">
            الحفظ غير متاح على هذا المتصفح، ولن تبقى الذكريات بعد إغلاق الصفحة.
          </p>
        )}

        {adding ? (
          <MemoryForm onSave={save} onCancel={() => setAdding(false)} today={today} />
        ) : (
          <Button fullWidth onClick={() => setAdding(true)}>
            أضيفا ذكرى
          </Button>
        )}

        {cities.length > 1 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">المدينة</legend>
            <div className="flex flex-wrap gap-2">
              <Chip pressed={city === null} onToggle={() => setCity(null)} hue={game.hue}>
                الكل
              </Chip>
              {cities.map((c) => (
                <Chip
                  key={c}
                  pressed={city === c}
                  onToggle={() => setCity(city === c ? null : c)}
                  hue={game.hue}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </fieldset>
        ) : null}

        {memories.length === 0 ? (
          <EmptyState
            title="لا ذكريات بعد"
            description="أضيفا أوّل ذكرى: عنوان، وتاريخ، ومدينة. مثال: «أوّل رحلة جمعتنا»."
          />
        ) : visible.length === 0 ? (
          <p role="status" className="text-ink-soft">
            لا ذكريات في هذه المدينة.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {years.map((g) => (
              <section key={g.year} className="flex flex-col gap-3">
                <h3 className="font-bold font-display text-ink-soft text-lg">
                  <Num value={g.year} />
                </h3>
                {g.items.map((m) => (
                  <MemoryRow key={m.id} memory={m} today={today} onDelete={() => remove(m.id)} />
                ))}
              </section>
            ))}
          </div>
        )}

        <PrivacyNote>
          كل ما تحفظانه هنا يبقى على هذا الجهاز وحده: لا حساب، ولا رفع، ولا مشاركة.
        </PrivacyNote>
      </div>
    </SessionFrame>
  );
}

function MemoryRow({
  memory,
  today,
  onDelete,
}: {
  memory: Memory;
  today: string;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-[var(--shadow-deck)]">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-display font-semibold text-lg leading-snug">{memory.title}</h4>
        {isAnniversarySoon(memory.date, today) ? (
          <StateBadge tone="open">ذكرى سنوية</StateBadge>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Tag>
          <DateText iso={memory.date} />
        </Tag>
        <Tag>{memory.city}</Tag>
      </div>
      {memory.note ? <p className="text-ink-soft">{memory.note}</p> : null}
      <div className="flex justify-start">
        <ConfirmDelete question={`نحذف «${memory.title}» نهائيًا؟`} onConfirm={onDelete} />
      </div>
    </article>
  );
}

function MemoryForm({
  today,
  onSave,
  onCancel,
}: {
  today: string;
  onSave: (d: MemoryDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<MemoryDraft>({ ...EMPTY, date: today });
  const [showError, setShowError] = useState(false);
  const patch = (p: Partial<MemoryDraft>) => setDraft((d) => ({ ...d, ...p }));
  const error = memoryError(draft);

  return (
    <form
      className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-[var(--shadow-deck)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (error === null) onSave(draft);
        else setShowError(true);
      }}
    >
      <h3 className="font-bold font-display text-xl">ذكرى جديدة</h3>

      <Field id="g28-title" label="العنوان" value={draft.title} max={MEMORY_LIMITS.title}>
        <input
          id="g28-title"
          type="text"
          value={draft.title}
          maxLength={MEMORY_LIMITS.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="مثلاً: أوّل رحلة جمعتنا"
          className={INPUT_CLASS}
        />
      </Field>

      <Field id="g28-date" label="التاريخ">
        <input
          id="g28-date"
          type="date"
          value={draft.date}
          max={today}
          onChange={(e) => patch({ date: e.target.value })}
          className={INPUT_CLASS}
        />
      </Field>

      <Field id="g28-city" label="المدينة أو المكان" value={draft.city} max={MEMORY_LIMITS.city}>
        <input
          id="g28-city"
          type="text"
          value={draft.city}
          maxLength={MEMORY_LIMITS.city}
          onChange={(e) => patch({ city: e.target.value })}
          placeholder="مثلاً: العقبة"
          className={INPUT_CLASS}
        />
      </Field>

      <Field
        id="g28-note"
        label="ملاحظة (اختياري)"
        value={draft.note ?? ""}
        max={MEMORY_LIMITS.note}
      >
        <textarea
          id="g28-note"
          rows={3}
          value={draft.note ?? ""}
          maxLength={MEMORY_LIMITS.note}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="ما الذي يجعل هذا اليوم يستحقّ التذكّر؟"
          className={`${INPUT_CLASS} py-3 leading-relaxed`}
        />
      </Field>

      {showError && error !== null ? (
        <p role="status" className="font-semibold text-danger text-sm">
          {ERRORS[error]}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button type="submit" fullWidth>
          احفظا الذكرى
        </Button>
        <Button variant="secondary" fullWidth onClick={onCancel}>
          تراجع
        </Button>
      </div>
    </form>
  );
}
