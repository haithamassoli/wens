"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G33_CARDS } from "@/lib/content";
import { G33, type G33Setup, type G33State, withDone } from "@/lib/engine/g33";
import type { Aliases } from "@/lib/engine/types";
import { countNoun, MINUTE_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { readSeen, useGameData } from "@/lib/storage";
import { ChoiceInput } from "./ChoiceRound";
import { Instructions, Stats } from "./Setup";
import { useSession } from "./useSession";

const CATEGORY: Record<string, string> = {
  language: "لغة",
  art: "رسم",
  photo: "تصوير",
  wellness: "صحة",
  craft: "أشغال يدوية",
  money: "ميزانية",
  food: "طعام",
  nature: "طبيعة",
  memory: "ذاكرة",
};

type Done = { done: string[] };
const NO_PROGRESS: Done = { done: [] };

/**
 * G33 — Learn Together (FR-G33): pick a lesson → read → do the exercise → one review question.
 * Completed lesson ids are stored locally; repeating a lesson keeps the list intact.
 */
export function G33Play({ game }: { game: GameMeta }) {
  const [data, setData, hydrated] = useGameData<Done>("G33", NO_PROGRESS);
  const [session, setSession] = useState<{ setup: G33Setup; seen: string[] } | null>(null);
  const lessons = G33_CARDS.filter((c) => c.status === "published");
  const [aliases, setAliases] = useState<Aliases>({ A: "", B: "" });
  const [lessonId, setLessonId] = useState<string>(lessons[0]?.id ?? "");
  const done = hydrated ? data.done : [];
  // Stable identity: the effect in Session depends on it. Same list → same object, no re-render loop.
  const markDone = useCallback(
    (id: string) =>
      setData((d) => {
        const next = withDone(d.done, id);
        return next === d.done ? d : { done: next };
      }),
    [setData],
  );

  if (session) return <Session game={game} {...session} onExerciseDone={markDone} />;

  return (
    <SessionFrame game={game}>
      <form
        className="flex flex-1 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (lessonId) setSession({ setup: { aliases, lessonId }, seen: readSeen(game.id) });
        }}
      >
        <p className="text-ink-soft">{game.tagline}</p>
        <AliasFields value={aliases} onChange={setAliases} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 flex w-full items-baseline justify-between font-semibold">
            <span>الدرس</span>
            <span className="text-ink-soft text-sm">
              أنجزتما <Num value={done.length} /> من <Num value={lessons.length} />
            </span>
          </legend>
          {lessons.map((c) => {
            const on = c.id === lessonId;
            const finished = done.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setLessonId(c.id)}
                style={on ? { borderColor: game.hue } : undefined}
                className={`flex min-h-14 flex-col gap-1 rounded-2xl border-2 bg-card px-5 py-3 text-start ${
                  on ? "" : "border-line hover:border-ink-faint"
                }`}
              >
                <span className="font-semibold">{c.body}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Tag hue={game.hue}>{CATEGORY[c.category] ?? c.category}</Tag>
                  <Tag>
                    <Num value={c.estimatedMinutes} /> {countNoun(c.estimatedMinutes, MINUTE_FORMS)}
                  </Tag>
                  {c.requiresTools ? <Tag>يحتاج أدوات</Tag> : null}
                  {finished ? <Tag>أُنجز من قبل</Tag> : null}
                </span>
              </button>
            );
          })}
        </fieldset>
        <div className="mt-auto flex flex-col gap-3">
          <p className="text-center text-ink-soft text-sm">
            لا شهادات ولا درجات؛ يُحفظ على هذا الهاتف ما أنجزتماه فقط.
          </p>
          <Button type="submit" fullWidth disabled={!lessonId}>
            ابدأ
          </Button>
        </div>
      </form>
    </SessionFrame>
  );
}

function Session({
  game,
  setup,
  seen,
  onExerciseDone,
}: {
  game: GameMeta;
  setup: G33Setup;
  seen: string[];
  onExerciseDone: (id: string) => void;
}) {
  const { state, send, restart } = useSession(G33, G33_CARDS, setup, seen);
  const { phase } = state;
  const card = state.deck[0];

  useEffect(() => {
    if (state.exerciseDone && card) onExerciseDone(card.id);
  }, [state.exerciseDone, card, onExerciseDone]);

  if (!card) {
    return (
      <SessionFrame game={game}>
        <p role="status" className="text-danger">
          الدرس غير متاح.
        </p>
      </SessionFrame>
    );
  }

  const q = card.question;
  const correctLabel = q.options.find((o) => o.id === q.answer)?.label ?? "";
  const last = state.completedRounds[0];

  return (
    <SessionFrame game={game} live={phase !== "results"} onExit={() => send({ type: "END" })}>
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {phase === "card" ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold font-display text-2xl">{card.body}</h2>
              <FavoriteButton kind="card" id={card.id} />
            </div>
            <p className="whitespace-pre-line leading-relaxed">{card.lesson}</p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "NEXT" })}>
              إلى التمرين
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "playing" ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft">التمرين معاً</p>
          <div className="flex min-h-44 flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
            <p className="flex-1 font-display font-semibold text-2xl leading-snug">
              {card.exercise}
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "DONE" })}>
              أنجزناه
            </Button>
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي التمرين
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "input" ? (
        <ChoiceInput
          headline="سؤال مراجعة سريع (من الدرس فقط)"
          cardId={card.id}
          body={q.body}
          options={q.options}
          selected={state.choice}
          hue={game.hue}
          onSelect={(optionId) => send({ type: "SUBMIT", player: "A", optionId })}
          onLock={() => send({ type: "LOCK", player: "A" })}
          onSkip={() => send({ type: "SKIP" })}
        />
      ) : null}

      {phase === "reveal" && last ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-card bg-card p-5">
            <p
              role="status"
              className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
                last.correct ? "border-mint bg-mint-soft" : "border-line bg-ground"
              }`}
            >
              {last.correct ? "إجابة صحيحة" : last.answered ? "ليست الإجابة" : "لم تُجيبا"}
            </p>
            <p>
              <span className="text-ink-soft">الإجابة: </span>
              <span className="font-semibold">{correctLabel}</span>
            </p>
            <p className="text-ink-soft">{q.explanation}</p>
          </div>
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
            إنهاء الدرس
          </Button>
        </div>
      ) : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G33State;
  onReplay: () => void;
}) {
  const r = G33.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title={r.exerciseDone ? "جرّبتما مهارة جديدة" : "انتهى الدرس"}
      note="بلا شهادات ولا درجات؛ المهم أنكما جرّبتما معاً."
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "التمرين", value: r.exerciseDone ? "أُنجز" : "لم يُنجز" },
          {
            label: "سؤال المراجعة",
            value: r.correct ? "صحيح" : r.answered ? "غير صحيح" : "بلا إجابة",
          },
        ]}
      />
    </ResultShell>
  );
}
