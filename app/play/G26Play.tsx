"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G26_CARDS } from "@/lib/content";
import {
  buildPlan,
  PLAN_BUDGETS,
  PLAN_MOODS,
  type Plan,
  type PlanBudget,
  type PlanMood,
  type PlanPart,
  planMinutes,
  type ResolvedPlan,
  replacePart,
  resolvePlan,
} from "@/lib/engine/g26";
import { countNoun, MINUTE_FORMS } from "@/lib/filters";
import { GAMES, type GameMeta } from "@/lib/games";
import { useGameData } from "@/lib/storage";
import { Instructions } from "./Setup";

const MOOD: Record<PlanMood, string> = { calm: "هادئ", fun: "مرح", deep: "عميق" };
const PARTS: [PlanPart, string][] = [
  ["opener", "الافتتاح"],
  ["game", "اللعبة"],
  ["closer", "الختام"],
];
const minutes = (n: number) => (
  <>
    <Num value={n} /> {countNoun(n, MINUTE_FORMS)}
  </>
);
const partOf = (r: ResolvedPlan, part: PlanPart) =>
  part === "game"
    ? { id: r.game.id, title: r.game.name, minutes: r.game.minutes, game: r.game }
    : { id: r[part].id, title: r[part].body, minutes: r[part].minutes, game: null };

/**
 * G26 — Our Night Planner: budget + mood → opener + game + closer (≤ budget), swap any part,
 * save explicitly (part ids only), then walk through the three parts. No rounds, no ranking.
 */
export function G26Play({ game }: { game: GameMeta }) {
  // ponytail: one saved plan per device; a shared plan across two phones is the Convex-sync upgrade.
  const [saved, setSaved, hydrated] = useGameData("G26", null as Plan | null);
  const [budget, setBudget] = useState<PlanBudget>(60);
  const [mood, setMood] = useState<PlanMood>("calm");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mode, setMode] = useState<"home" | "instructions" | "plan" | "run" | "done">("home");
  const [step, setStep] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const ctx = { cards: G26_CARDS, games: GAMES, budget, mood };
  const canBuild = buildPlan(ctx) !== null; // deterministic: null only when no triple fits
  const resolved = plan ? resolvePlan(plan, G26_CARDS, GAMES) : null;
  const savedResolved = hydrated && saved ? resolvePlan(saved, G26_CARDS, GAMES) : null;
  const build = () => {
    const next = buildPlan(ctx);
    setPlan(next);
    setJustSaved(false);
    setMode(next ? "plan" : "home");
  };
  const start = (p: Plan) => {
    setPlan(p);
    setStep(0);
    setMode("run");
  };

  if (mode === "instructions") {
    return (
      <SessionFrame game={game}>
        <Instructions game={game} onStart={build} />
      </SessionFrame>
    );
  }

  if (mode === "plan" && plan && resolved) {
    const total = planMinutes(resolved);
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold font-display text-2xl">خطة سهرتكما</h2>
            <p role="status" aria-live="polite" className="text-ink-soft text-sm">
              المجموع {minutes(total)} من {minutes(budget)} · {MOOD[mood]}
            </p>
          </div>
          <ol className="flex flex-col gap-3">
            {PARTS.map(([part, label]) => (
              <li key={part}>
                <PartCard label={label} item={partOf(resolved, part)} hue={game.hue}>
                  <Button
                    variant="secondary"
                    className="!min-h-11"
                    onClick={() => {
                      setPlan((p) => (p ? replacePart(ctx, p, part) : p));
                      setJustSaved(false);
                    }}
                  >
                    بدّل
                  </Button>
                </PartCard>
              </li>
            ))}
          </ol>
          <p className="text-ink-faint text-sm">
            «بدّل» يغيّر هذا الجزء وحده، ولا يتجاوز المجموع وقتكما أبداً.
          </p>
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => start(plan)}>
              ابدأ السهرة
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={justSaved}
              onClick={() => {
                setSaved(plan);
                setJustSaved(true);
              }}
            >
              {justSaved ? "حُفظت الخطة" : "احفظ الخطة"}
            </Button>
            <Button variant="ghost" fullWidth onClick={build}>
              خطة أخرى
            </Button>
          </div>
        </div>
      </SessionFrame>
    );
  }

  if (mode === "run" && resolved) {
    const [part, label] = PARTS[step];
    const item = partOf(resolved, part);
    return (
      <SessionFrame game={game} progress={{ current: step + 1, total: PARTS.length }}>
        <div className="flex flex-1 flex-col gap-5">
          <PartCard label={label} item={item} hue={game.hue} big />
          {item.game ? (
            <>
              <p className="text-ink-soft">{item.game.tagline}</p>
              {/* ponytail: leaving to the game drops this walkthrough; a saved plan brings you back via «ابدأ». */}
              <Button variant="secondary" fullWidth href={`/play/${item.game.id}`}>
                افتحا اللعبة
              </Button>
            </>
          ) : null}
          <div className="mt-auto flex flex-col gap-2">
            <Button
              fullWidth
              onClick={() => (step + 1 < PARTS.length ? setStep(step + 1) : setMode("done"))}
            >
              {step + 1 < PARTS.length ? "أنجزناه، التالي" : "أنهينا السهرة"}
            </Button>
            {step > 0 ? (
              <Button variant="ghost" fullWidth onClick={() => setStep(step - 1)}>
                السابق
              </Button>
            ) : null}
          </div>
        </div>
      </SessionFrame>
    );
  }

  if (mode === "done" && resolved) {
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title="سهرة جميلة!"
          note="لا ترتيب ولا نقاط هنا؛ المهمّ أنكما قضيتماها معاً."
          onReplay={() => setMode("home")}
        >
          <ul className="flex flex-col gap-2 text-ink-soft">
            {PARTS.map(([part, label]) => {
              const item = partOf(resolved, part);
              return (
                <li key={part} className="flex items-baseline justify-between gap-4">
                  <span>
                    <span className="font-semibold text-ink">{label}: </span>
                    {item.title}
                  </span>
                  <span className="shrink-0 text-sm">{minutes(item.minutes)}</span>
                </li>
              );
            })}
          </ul>
        </ResultShell>
      </SessionFrame>
    );
  }

  // home: the saved plan (if any) plus the budget/mood setup
  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-6">
        {savedResolved && saved ? (
          <section className="card-in flex flex-col gap-3 rounded-card bg-card p-5 shadow-[var(--shadow-deck)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold font-display text-xl">خطتكما المحفوظة</h2>
              <span className="text-ink-soft text-sm">{minutes(planMinutes(savedResolved))}</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-ink-soft">
              {PARTS.map(([part, label]) => (
                <li key={part}>
                  <span className="font-semibold text-ink">{label}: </span>
                  {partOf(savedResolved, part).title}
                </li>
              ))}
            </ul>
            {confirmDelete ? (
              <div
                role="alertdialog"
                aria-label="تأكيد الحذف"
                className="flex flex-col gap-2 border-line border-t pt-3"
              >
                <p>حذف الخطة المحفوظة؟</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      setSaved(null);
                      setConfirmDelete(false);
                    }}
                  >
                    احذف
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => start(saved)}>
                  ابدأ
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(true)}>
                  احذف
                </Button>
              </div>
            )}
          </section>
        ) : null}

        <form
          className="flex flex-1 flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMode("instructions");
          }}
        >
          <p className="text-ink-soft">{game.tagline}</p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">كم من الوقت لديكما؟</legend>
            <div className="flex flex-wrap gap-2">
              {PLAN_BUDGETS.map((b) => (
                <Chip key={b} pressed={budget === b} onToggle={() => setBudget(b)} hue={game.hue}>
                  {minutes(b)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">المزاج</legend>
            <div className="flex flex-wrap gap-2">
              {PLAN_MOODS.map((m) => (
                <Chip key={m} pressed={mood === m} onToggle={() => setMood(m)} hue={game.hue}>
                  {MOOD[m]}
                </Chip>
              ))}
            </div>
          </fieldset>
          {canBuild ? null : (
            <p role="status" className="text-danger">
              لا خطة تناسب هذا الوقت والمزاج. جرّبا وقتاً أطول أو مزاجاً آخر.
            </p>
          )}
          <div className="mt-auto flex flex-col gap-3">
            <p className="text-center text-ink-soft text-sm">
              لا يُحفظ شيء إلا حين تضغطان «احفظ الخطة».
            </p>
            <Button type="submit" fullWidth disabled={!canBuild}>
              ابنِ الخطة
            </Button>
          </div>
        </form>
      </div>
    </SessionFrame>
  );
}

function PartCard({
  label,
  item,
  hue,
  big = false,
  children,
}: {
  label: string;
  item: { id: string; title: string; minutes: number; game: GameMeta | null };
  hue: string;
  big?: boolean;
  children?: ReactNode;
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-card border-s-8 bg-card shadow-[var(--shadow-deck)] ${
        big ? "p-6" : "p-4"
      }`}
      style={{ borderColor: item.game ? item.game.hue : hue }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag hue={hue}>{label}</Tag>
        <Tag>{minutes(item.minutes)}</Tag>
      </div>
      <p className={`font-display font-semibold leading-snug ${big ? "text-2xl" : "text-lg"}`}>
        {item.title}
      </p>
      <div className="flex items-end justify-between gap-3">
        <div>{children}</div>
        <FavoriteButton kind={item.game ? "game" : "card"} id={item.id} />
      </div>
    </article>
  );
}
