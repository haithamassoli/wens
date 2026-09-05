"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G16_CARDS } from "@/lib/content";
import {
  G16,
  G16_INGREDIENTS,
  G16_PRESENTATION,
  type G16Setup,
  type G16State,
  relaxHints,
} from "@/lib/engine/g16";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen } from "@/lib/storage";

const CATEGORY: Record<string, string> = {
  sandwich: "ساندويتش",
  eggs: "بيض",
  salad: "سلطة",
  warm: "طبق دافئ",
  sweet: "حلو",
  drink: "مشروب",
};

const recipes = (n: number) =>
  n === 1 ? (
    "وصفة واحدة"
  ) : n === 2 ? (
    "وصفتان"
  ) : (
    <>
      <Num value={n} /> {n <= 10 ? "وصفات" : "وصفة"}
    </>
  );

/** Arabic count agreement: dual drops the numeral, like `recipes` above. */
const ingredients = (n: number) =>
  n === 1 ? (
    "مكوّن واحد"
  ) : n === 2 ? (
    "مكوّنان"
  ) : (
    <>
      <Num value={n} /> مكوّنات
    </>
  );

const suggestions = (n: number) =>
  n === 1 ? (
    "اقتراحاً واحداً"
  ) : n === 2 ? (
    "اقتراحين"
  ) : (
    <>
      <Num value={n} /> اقتراحات
    </>
  );

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export function G16Play({ game }: { game: GameMeta }) {
  const [aliases, setAliases] = useState({ A: "", B: "" });
  const [available, setAvailable] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const setup: G16Setup = { aliases, available, excluded };
  const count = G16.availableCount(G16_CARDS, setup);

  const [state, setState] = useState<G16State | null>(null);
  const [swapped, setSwapped] = useState(false);
  const send = useCallback((e: Event) => setState((s) => (s ? G16.reduce(s, e) : s)), []);
  const start = () => {
    setSwapped(false);
    setState(G16.initialState(G16.buildDeck(G16_CARDS, setup, readSeen("G16")), setup));
  };

  // Seen history: the recipes actually put in front of the couple (FR-CORE-07).
  useEffect(() => {
    if (state?.phase !== "results") return;
    markSeen(
      "G16",
      state.deck.slice(0, state.roundIndex + 1).map((c) => c.id),
    );
  }, [state]);

  if (!state) {
    const hints = relaxHints(G16_CARDS, setup);
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">ماذا يوجد في مطبخكما؟</h2>
          <AliasFields value={aliases} onChange={setAliases} />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">المتوفّر لدينا</legend>
            <div className="flex flex-wrap gap-2">
              {G16_INGREDIENTS.map((i) => (
                <Chip
                  key={i}
                  pressed={available.includes(i)}
                  onToggle={() => setAvailable((l) => toggle(l, i))}
                  hue={game.hue}
                >
                  {i}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">نستبعد تماماً</legend>
            <p className="text-ink-soft text-sm">
              ما تختارانه هنا لن يظهر في أي وصفة نقترحها، مهما كان الباقي متوفّراً.
            </p>
            <div className="flex flex-wrap gap-2">
              {G16_INGREDIENTS.map((i) => (
                <Chip
                  key={i}
                  pressed={excluded.includes(i)}
                  onToggle={() => setExcluded((l) => toggle(l, i))}
                >
                  {i}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div role="status" className="flex flex-col gap-2">
            {count > 0 ? (
              <p className="text-ink-soft">تطابق {recipes(count)}.</p>
            ) : hints.blockedByExclusions ? (
              <p className="rounded-card bg-card p-4">
                <span className="font-semibold">كل وصفاتنا تحتوي على شيء استبعدتماه.</span> لن نقترح
                تجاهل الاستبعاد؛ إن غيّرتما رأيكما فأزيلا استبعاداً بأنفسكما.
              </p>
            ) : hints.suggest.length ? (
              <div className="rounded-card bg-card p-4">
                <p className="font-semibold">لا وصفة تطابق ما لديكما بالضبط.</p>
                <p className="mt-1 text-ink-soft">
                  أقرب وصفة ينقصها {ingredients(hints.closestMissing)}. جرّبا إضافة واحد من هذه إلى
                  «المتوفّر لدينا» — الاستبعاد يبقى كما هو.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hints.suggest.map((h) => (
                    <Chip
                      key={h.ingredient}
                      pressed={false}
                      onToggle={() => setAvailable((l) => toggle(l, h.ingredient))}
                      hue={game.hue}
                    >
                      + {h.ingredient}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-ink-soft">اختارا ما لديكما لنبدأ.</p>
            )}
          </div>

          <p className="text-ink-soft text-sm">
            وصفات بسيطة مجرّبة، بلا أي وعود صحّية. راجعا المكوّنات بأنفسكما قبل الطبخ.
          </p>
          <Button fullWidth className="mt-auto" disabled={count === 0} onClick={start}>
            اقترحا علينا طبقاً
          </Button>
        </div>
      </SessionFrame>
    );
  }

  if (state.phase === "instructions") {
    return (
      <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
        <div className="flex flex-1 flex-col gap-6">
          <ol className="flex flex-col gap-3">
            {game.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-card bg-card p-4">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full font-bold text-white"
                  style={{ backgroundColor: game.hue }}
                >
                  <Num value={i + 1} />
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "START" })}>
            مستعدّان؟
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const { cardId, cooked, rejected, presentation } = G16.deriveResult(state);
  const label = G16_PRESENTATION.find((p) => p.id === presentation);

  if (state.phase === "results") {
    const dish = state.deck.find((c) => c.id === cardId);
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={cooked ? "أنجزنا الطبق!" : "لم نتّفق على طبق هذه المرّة"}
          note={
            cooked ? undefined : "لا بأس؛ غيّرا ما لديكما أو أعيدا المحاولة حين تشتهيان شيئاً آخر."
          }
          onReplay={() => setState(null)}
        >
          {dish ? (
            <div className="flex flex-col gap-3">
              <p className="font-display font-semibold text-xl">{dish.body}</p>
              {label ? (
                <p className="rounded-xl bg-mint-soft p-3 text-center">
                  <span aria-hidden="true" className="text-2xl">
                    {label.emoji}
                  </span>
                  <span className="block font-semibold">تقييم العرض: {label.label}</span>
                </p>
              ) : null}
              {rejected > 0 ? (
                <p className="text-ink-soft text-sm">
                  تجاوزتما {suggestions(rejected)} قبل هذا الطبق.
                </p>
              ) : null}
            </div>
          ) : null}
        </ResultShell>
      </SessionFrame>
    );
  }

  const dish = state.deck[state.roundIndex];
  const tasks: [string, string] = swapped
    ? [dish.tasks[1], dish.tasks[0]]
    : [dish.tasks[0], dish.tasks[1]];
  const nameA = aliases.A.trim() || state.aliases.A;
  const nameB = aliases.B.trim() || state.aliases.B;

  return (
    <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
      <div className="flex flex-1 flex-col gap-5">
        <article
          className="rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
          style={{ borderColor: game.hue }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Tag hue={game.hue}>{CATEGORY[dish.category] ?? dish.category}</Tag>
              <Tag>
                <Num value={dish.minutes} /> دقيقة
              </Tag>
            </div>
            <FavoriteButton kind="card" id={dish.id} />
          </div>
          <h2 className="mt-4 font-bold font-display text-2xl leading-snug">{dish.body}</h2>

          <h3 className="mt-5 font-semibold text-ink-soft text-sm">المكوّنات</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dish.ingredients.map((i) => (
              <Tag key={i}>{i}</Tag>
            ))}
          </div>

          <h3 className="mt-4 font-semibold text-ink-soft text-sm">الأدوات</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dish.tools.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>

          <h3 className="mt-5 font-semibold">الخطوات</h3>
          <ol className="mt-2 flex list-inside list-decimal flex-col gap-1 text-ink-soft">
            {dish.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </article>

        {state.phase === "card" ? (
          <section className="rounded-card bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">من يفعل ماذا</h3>
              <Button variant="ghost" onClick={() => setSwapped((v) => !v)}>
                بدّلا المهمّتين
              </Button>
            </div>
            <dl className="mt-3 flex flex-col gap-2">
              {([nameA, nameB] as const).map((who, i) => (
                <div key={who} className="rounded-xl bg-ground p-3">
                  <dt className="font-semibold">{who}</dt>
                  <dd className="text-ink-soft">{tasks[i]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <section className="rounded-card bg-card p-5">
            <h3 className="font-semibold">تقييم العرض</h3>
            <p className="mt-1 text-ink-soft text-sm">
              وصف واحد للطبق كما ظهر أمامكما. لا مقارنة بينكما ولا نقاط.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {G16_PRESENTATION.map((p) => (
                <Chip
                  key={p.id}
                  pressed={presentation === p.id}
                  onToggle={() => send({ type: "SET", key: "presentation", value: p.id })}
                  hue={game.hue}
                >
                  <span aria-hidden="true">{p.emoji}</span> {p.label}
                </Chip>
              ))}
            </div>
          </section>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {state.phase === "card" ? (
            <>
              <Button fullWidth onClick={() => send({ type: "DONE" })}>
                أنجزنا الطبق
              </Button>
              <Button variant="secondary" fullWidth onClick={() => send({ type: "SKIP" })}>
                اقتراح آخر
              </Button>
            </>
          ) : (
            <Button fullWidth onClick={() => send({ type: "NEXT" })}>
              أنهيا الجلسة
            </Button>
          )}
        </div>
      </div>
    </SessionFrame>
  );
}
