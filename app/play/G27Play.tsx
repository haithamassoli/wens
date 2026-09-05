"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G27_CARDS } from "@/lib/content";
import {
  ALL_WISHES,
  addWish,
  canAddWish,
  exampleWishes,
  filterWishes,
  markWishTried,
  pickTogether,
  planWish,
  removeWish,
  WISH_TITLE_MAX,
  type Wish,
  type WishCost,
  type WishDraft,
  type WishFilter,
  type WishWhen,
  wishCounts,
} from "@/lib/engine/g27";
import { withDefaultAliases } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { useGameData } from "@/lib/storage";

const COSTS: [WishCost, string][] = [
  ["free", "بلا تكلفة"],
  ["low", "تكلفة بسيطة"],
  ["medium", "تحتاج ادّخاراً"],
];
const WHENS: [WishWhen, string][] = [
  ["soon", "قريباً"],
  ["someday", "يوماً ما"],
  ["date", "بتاريخ نختاره"],
];
const STATES: [Wish["state"], string][] = [
  ["idea", "فكرة"],
  ["planned", "مخطّطة"],
  ["tried", "جرّبناها"],
];
const COST_LABEL = Object.fromEntries(COSTS) as Record<WishCost, string>;
const STATE_LABEL = Object.fromEntries(STATES) as Record<Wish["state"], string>;
const WHEN_LABEL = Object.fromEntries(WHENS) as Record<WishWhen, string>;

const inputClass = "min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink";

function Group<T extends string>({
  label,
  options,
  value,
  onPick,
  hue,
}: {
  label: string;
  options: [T, string][];
  value: T;
  onPick: (v: T) => void;
  hue?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold text-sm">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, text]) => (
          <Chip key={v} pressed={value === v} onToggle={() => onPick(v)} hue={hue}>
            {text}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function G27Play({ game }: { game: GameMeta }) {
  // ponytail: one jar on one device, so a write always wins and nothing can be merged away.
  // Convex sync (both phones on the same jar, additions never overwriting each other) is the R3 upgrade.
  const [data, setData, hydrated] = useGameData("G27", { wishes: [] as Wish[] });
  const [aliases, setAliases] = useState({ A: "", B: "" });
  const [step, setStep] = useState<"setup" | "instructions" | "jar">("setup");

  const names = withDefaultAliases(aliases);
  const [draft, setDraft] = useState<WishDraft>({
    by: "A",
    title: "",
    cost: "free",
    when: "someday",
  });
  const [filter, setFilter] = useState<WishFilter>(ALL_WISHES);
  const [chosen, setChosen] = useState<Wish | null>(null);
  const [firstStep, setFirstStep] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const update = (f: (w: Wish[]) => Wish[]) => setData((d) => ({ wishes: f(d.wishes) }));

  if (step === "setup") {
    return (
      <SessionFrame game={game}>
        <form
          className="flex flex-1 flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("instructions");
          }}
        >
          <p className="text-ink-soft">{game.tagline}</p>
          <AliasFields value={aliases} onChange={setAliases} />
          <p className="text-ink-soft text-sm">
            تبقى الأمنيات على هذا الجهاز وحده. لا تذكيرات ولا مواعيد ملزمة؛ الأمنية تبقى أمنية.
          </p>
          <Button type="submit" fullWidth className="mt-auto">
            افتحا الجرّة
          </Button>
        </form>
      </SessionFrame>
    );
  }

  if (step === "instructions") {
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <ol className="flex flex-col gap-3">
            {game.steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 rounded-card bg-card p-4">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full font-bold text-white"
                  style={{ backgroundColor: game.hue }}
                >
                  <Num value={i + 1} />
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <Button fullWidth className="mt-auto" onClick={() => setStep("jar")}>
            هيّا
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const wishes = data.wishes;
  const counts = wishCounts(wishes);
  const shown = filterWishes(wishes, filter);
  const who = (w: Wish) => names[w.by];

  const addFrom = (title: string, cost: WishCost) => {
    update((list) => addWish(list, { by: draft.by, title, cost, when: "someday" }));
  };

  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-6">
        <form
          className="flex flex-col gap-4 rounded-card bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canAddWish(draft)) return;
            update((list) => addWish(list, draft));
            setDraft({ ...draft, title: "" });
          }}
        >
          <h2 className="font-bold font-display text-xl">أمنية جديدة</h2>
          <label className="flex flex-col gap-1 text-ink-soft text-sm">
            ماذا نريد أن نفعل؟
            <input
              type="text"
              maxLength={WISH_TITLE_MAX}
              autoComplete="off"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="مثلاً: نرى الشروق مرّة واحدة"
              className={`${inputClass} placeholder:text-ink-faint`}
            />
          </label>
          <Group
            label="من أضافها"
            options={[
              ["A", names.A],
              ["B", names.B],
            ]}
            value={draft.by}
            onPick={(by) => setDraft({ ...draft, by })}
            hue={game.hue}
          />
          <Group
            label="التكلفة تقريباً"
            options={COSTS}
            value={draft.cost}
            onPick={(cost) => setDraft({ ...draft, cost })}
            hue={game.hue}
          />
          <Group
            label="متى؟"
            options={WHENS}
            value={draft.when}
            onPick={(when) => setDraft({ ...draft, when })}
            hue={game.hue}
          />
          {draft.when === "date" ? (
            <label className="flex flex-col gap-1 text-ink-soft text-sm">
              تاريخ مبدئي، ولنا أن نغيّره
              <input
                type="date"
                value={draft.date ?? ""}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className={inputClass}
              />
            </label>
          ) : null}
          <Button type="submit" fullWidth disabled={!canAddWish(draft)}>
            أضيفاها إلى الجرّة
          </Button>
        </form>

        {!hydrated ? (
          <p role="status" className="text-ink-soft">
            نفتح الجرّة…
          </p>
        ) : wishes.length === 0 ? (
          <section className="rounded-card bg-card p-5">
            <h2 className="font-bold font-display text-xl">الجرّة فارغة</h2>
            <p className="mt-1 text-ink-soft">
              هذه أمثلة لتبدآ منها؛ اضغطا واحدة لتصير أمنيتكما، أو اكتبا شيئاً خاصاً بكما.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {exampleWishes(G27_CARDS).map((c) => (
                <Chip
                  key={c.id}
                  pressed={false}
                  onToggle={() => addFrom(c.body, c.cost)}
                  hue={game.hue}
                >
                  + {c.body}
                </Chip>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold font-display text-xl">
                  في الجرّة <Num value={wishes.length} />
                </h2>
                <p className="text-ink-soft text-sm">
                  أفكار <Num value={counts.idea} /> · مخطّطة <Num value={counts.planned} /> · جرّبناها{" "}
                  <Num value={counts.tried} />
                </p>
              </div>
              <Group
                label="الحالة"
                options={[["all", "الكل"] as ["all", string], ...STATES]}
                value={filter.state}
                onPick={(state) => setFilter({ ...filter, state })}
                hue={game.hue}
              />
              <Group
                label="التكلفة"
                options={[["all", "الكل"] as ["all", string], ...COSTS]}
                value={filter.cost}
                onPick={(cost) => setFilter({ ...filter, cost })}
                hue={game.hue}
              />
            </section>

            <Button
              variant="secondary"
              fullWidth
              disabled={counts.idea === 0}
              onClick={() => {
                setChosen(pickTogether(wishes));
                setFirstStep("");
              }}
            >
              نختار واحدة معاً
            </Button>

            {chosen ? (
              <section role="status" className="rounded-card bg-mint-soft p-5">
                <p className="text-ink-soft text-sm">اختارت الجرّة</p>
                <p className="mt-1 font-bold font-display text-xl">{chosen.title}</p>
                <label className="mt-4 flex flex-col gap-1 text-ink-soft text-sm">
                  ما أول خطوة صغيرة نحوها؟
                  <input
                    type="text"
                    maxLength={80}
                    autoComplete="off"
                    value={firstStep}
                    onChange={(e) => setFirstStep(e.target.value)}
                    placeholder="مثلاً: نضبط المنبّه ليلة الجمعة"
                    className={`${inputClass} placeholder:text-ink-faint`}
                  />
                </label>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    fullWidth
                    disabled={firstStep.trim().length === 0}
                    onClick={() => {
                      update((list) => planWish(list, chosen.id, firstStep));
                      setChosen(null);
                    }}
                  >
                    هذه خطوتنا الأولى
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => setChosen(null)}>
                    ليس الآن
                  </Button>
                </div>
              </section>
            ) : null}

            <ul className="flex flex-col gap-3">
              {shown.length === 0 ? (
                <li className="rounded-card bg-card p-5 text-ink-soft">
                  لا أمنية بهذه الفلاتر. جرّبا «الكل».
                </li>
              ) : null}
              {shown.map((w) => (
                <li key={w.id} className="rounded-card bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display font-semibold text-lg leading-snug">{w.title}</p>
                    <Tag hue={game.hue}>{STATE_LABEL[w.state]}</Tag>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Tag>{who(w)}</Tag>
                    <Tag>{COST_LABEL[w.cost]}</Tag>
                    <Tag>
                      {w.when === "date" && w.date ? <Num value={w.date} /> : WHEN_LABEL[w.when]}
                    </Tag>
                  </div>
                  {w.step ? (
                    <p className="mt-3 rounded-xl bg-ground p-3 text-sm">
                      <span className="font-semibold">أول خطوة: </span>
                      {w.step}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {w.state === "tried" ? null : (
                      <Button
                        variant="secondary"
                        onClick={() => update((list) => markWishTried(list, w.id))}
                      >
                        جرّبناها
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setConfirmId(w.id)}>
                      حذف
                    </Button>
                  </div>
                  {confirmId === w.id ? (
                    <div role="status" className="mt-3 rounded-xl border border-danger/40 p-3">
                      <p className="font-semibold">نحذف «{w.title}» نهائياً؟</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          onClick={() => {
                            update((list) => removeWish(list, w.id));
                            setConfirmId(null);
                          }}
                        >
                          نعم، احذفاها
                        </Button>
                        <Button variant="secondary" onClick={() => setConfirmId(null)}>
                          تراجعنا
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button variant="secondary" fullWidth href={`/games/${game.slug}`}>
            العودة إلى اللعبة
          </Button>
          <Button variant="ghost" fullWidth href="/">
            الرئيسية
          </Button>
        </div>
      </div>
    </SessionFrame>
  );
}
