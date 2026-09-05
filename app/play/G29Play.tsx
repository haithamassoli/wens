"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G29_CARDS } from "@/lib/content";
import {
  addLetter,
  canDelete,
  countByState,
  LETTER_MAX_BODY,
  type Letter,
  type LetterDraft,
  letterError,
  type Recipient,
  removeLetter,
  sortLetters,
  stateOf,
} from "@/lib/engine/g29";
import { type Aliases, withDefaultAliases } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { useGameData, useStorageAvailable } from "@/lib/storage";
import { Instructions } from "./Setup";
import {
  addDays,
  ConfirmDelete,
  DateText,
  Field,
  INPUT_CLASS,
  PrivacyNote,
  StateBadge,
  todayISO,
} from "./shared/album";

const ERRORS: Record<NonNullable<ReturnType<typeof letterError>>, string> = {
  body: "اكتب نصّ الرسالة ضمن الحدّ المبيّن أعلى الصندوق.",
  openAt: "اختر تاريخًا صحيحًا للفتح.",
  openAtPast: "تاريخ الفتح يجب أن يكون بعد اليوم.",
};

type Mode = "intro" | "list" | "compose" | "review";

/** G29 — A Letter to the Future (FR-G29). A locked letter's body is never rendered. */
export function G29Play({ game }: { game: GameMeta }) {
  const [data, setData, hydrated] = useGameData("G29", { letters: [] as Letter[] });
  const storage = useStorageAvailable();
  const [today] = useState(todayISO);
  const [mode, setMode] = useState<Mode>("intro");
  const [names, setNames] = useState({ A: "", B: "" });
  // ponytail: aliases stay in page memory — storage never holds names (DATA-02).
  const aliases: Aliases = withDefaultAliases(names);
  const [draft, setDraft] = useState<LetterDraft>({
    from: "A",
    to: "B",
    openAt: addDays(today, 1),
    body: "",
  });
  const [opened, setOpened] = useState<string[]>([]); // session only: nothing is marked as read

  const letters = sortLetters(data.letters, today);
  const counts = countByState(data.letters, today);
  const error = letterError(draft, today);

  const nameOf = (r: Recipient) => (r === "both" ? "كلانا" : aliases[r]);

  const save = () => {
    setData((d) => ({ ...d, letters: addLetter(d.letters, draft, today) }));
    setDraft({ from: draft.from, to: draft.to, openAt: addDays(today, 1), body: "" });
    setMode("list");
  };

  if (!hydrated)
    return (
      <SessionFrame game={game}>
        <p role="status" className="text-ink-soft">
          نفتح صندوق رسائلكما…
        </p>
      </SessionFrame>
    );

  if (mode === "intro")
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <Instructions game={game} onStart={() => setMode("list")} />
          <AliasFields value={names} onChange={setNames} />
          <PrivacyNote>
            الأسماء للعرض في هذه الجلسة فقط ولا تُحفظ. الرسائل نفسها تبقى على هذا الجهاز.
          </PrivacyNote>
        </div>
      </SessionFrame>
    );

  if (mode === "compose" || mode === "review") {
    const chips = <K extends "from" | "to">(
      key: K,
      label: string,
      options: [LetterDraft[K], string][],
    ) => (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([value, text]) => (
            <Chip
              key={String(value)}
              pressed={draft[key] === value}
              onToggle={() => setDraft((d) => ({ ...d, [key]: value }))}
              hue={game.hue}
            >
              {text}
            </Chip>
          ))}
        </div>
      </fieldset>
    );

    if (mode === "review")
      return (
        <SessionFrame game={game} live onExit={() => setMode("list")}>
          <div className="flex flex-1 flex-col gap-5">
            <h2 className="font-bold font-display text-2xl">راجعا قبل الحفظ</h2>
            <dl className="flex flex-col divide-y divide-line rounded-card bg-card p-5">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-soft">من</dt>
                <dd className="font-semibold">{aliases[draft.from]}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-soft">إلى</dt>
                <dd className="font-semibold">{nameOf(draft.to)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-soft">تُفتح في</dt>
                <dd className="font-semibold">
                  <DateText iso={draft.openAt} />
                </dd>
              </div>
            </dl>
            <p role="status" className="text-ink-soft">
              بعد الحفظ تبقى الرسالة مقفلة ولا يظهر نصّها حتى يحلّ هذا التاريخ. يمكن حذفها قبل ذلك
              فقط.
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <Button fullWidth onClick={save}>
                احفظ الرسالة
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setMode("compose")}>
                عودة إلى الكتابة
              </Button>
            </div>
          </div>
        </SessionFrame>
      );

    return (
      <SessionFrame game={game} live onExit={() => setMode("list")}>
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (error === null) setMode("review");
          }}
        >
          <h2 className="font-bold font-display text-2xl">رسالة جديدة</h2>

          {chips("from", "من", [
            ["A", aliases.A],
            ["B", aliases.B],
          ])}
          {chips("to", "إلى", [
            ["A", aliases.A],
            ["B", aliases.B],
            ["both", "كلانا"],
          ])}

          <Field id="g29-openat" label="تاريخ الفتح">
            <input
              id="g29-openat"
              type="date"
              value={draft.openAt}
              min={addDays(today, 1)}
              onChange={(e) => setDraft((d) => ({ ...d, openAt: e.target.value }))}
              className={INPUT_CLASS}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">بداية جاهزة (اختياري)</legend>
            <div className="flex flex-wrap gap-2">
              {G29_CARDS.map((c) => (
                <Chip
                  key={c.id}
                  pressed={draft.body.startsWith(c.body)}
                  onToggle={() =>
                    setDraft((d) => ({
                      ...d,
                      body: d.body.startsWith(c.body)
                        ? d.body.slice(c.body.length).trimStart()
                        : `${c.body} ${d.body}`.trim().slice(0, LETTER_MAX_BODY),
                    }))
                  }
                  hue={game.hue}
                >
                  {c.body}
                </Chip>
              ))}
            </div>
          </fieldset>

          <Field id="g29-body" label="نصّ الرسالة" value={draft.body} max={LETTER_MAX_BODY}>
            <textarea
              id="g29-body"
              rows={8}
              value={draft.body}
              maxLength={LETTER_MAX_BODY}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              placeholder="اكتب ما تحبّ أن يُقرأ في ذلك اليوم…"
              className={`${INPUT_CLASS} py-3 leading-relaxed`}
            />
          </Field>

          {error === null ? null : (
            <p role="status" className="text-ink-soft text-sm">
              {ERRORS[error]}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <Button type="submit" fullWidth disabled={error !== null}>
              راجع ثم احفظ
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setMode("list")}>
              تراجع
            </Button>
          </div>
        </form>
      </SessionFrame>
    );
  }

  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-bold font-display text-2xl">رسائلكما</h2>
          <p className="text-ink-soft text-sm" aria-live="polite">
            <Num value={counts.available} /> متاحة · <Num value={counts.locked} /> مقفلة
          </p>
        </div>

        {storage ? null : (
          <p role="status" className="rounded-xl bg-ground-deep p-3 text-danger text-sm">
            الحفظ غير متاح على هذا المتصفح، ولن تبقى الرسائل بعد إغلاق الصفحة.
          </p>
        )}

        <Button fullWidth onClick={() => setMode("compose")}>
          اكتبا رسالة
        </Button>

        {letters.length === 0 ? (
          <EmptyState
            title="لا رسائل بعد"
            description="اكتب رسالة قصيرة، واختر يومًا في المستقبل تُفتح فيه."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {letters.map((l) => (
              <LetterRow
                key={l.id}
                letter={l}
                today={today}
                fromName={aliases[l.from]}
                toName={nameOf(l.to)}
                open={opened.includes(l.id)}
                onOpen={() => setOpened((o) => [...o, l.id])}
                onDelete={() => setData((d) => ({ ...d, letters: removeLetter(d.letters, l.id) }))}
              />
            ))}
          </div>
        )}

        <PrivacyNote>
          الرسائل محفوظة على هذا الجهاز وحده، ولا يظهر نصّ الرسالة المقفلة قبل يومها.
        </PrivacyNote>
      </div>
    </SessionFrame>
  );
}

function LetterRow({
  letter,
  today,
  fromName,
  toName,
  open,
  onOpen,
  onDelete,
}: {
  letter: Letter;
  today: string;
  fromName: string;
  toName: string;
  open: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const locked = stateOf(letter, today) === "locked";

  return (
    <article className="card-in flex flex-col gap-3 rounded-card bg-card p-4 shadow-[var(--shadow-deck)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          من {fromName} إلى {toName}
        </p>
        <StateBadge tone={locked ? "quiet" : "open"}>{locked ? "مقفلة" : "متاحة"}</StateBadge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Tag>
          {locked ? "تُفتح في " : "فُتحت في "}
          <DateText iso={letter.openAt} />
        </Tag>
      </div>

      {/* A locked letter's body never reaches the DOM. */}
      {locked ? (
        <p className="text-ink-soft text-sm">النصّ محجوب حتى يحلّ التاريخ.</p>
      ) : open ? (
        <p className="whitespace-pre-wrap leading-relaxed">{letter.body}</p>
      ) : (
        <Button variant="secondary" onClick={onOpen}>
          افتح الرسالة
        </Button>
      )}

      {canDelete(letter, today) ? (
        <div className="flex justify-start">
          <ConfirmDelete
            label="حذف قبل الفتح"
            question="يحذفها كاتبها وحده: نحذف هذه الرسالة نهائيًا قبل أن تُفتح؟"
            onConfirm={onDelete}
          />
        </div>
      ) : null}
    </article>
  );
}
