"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G21_CARDS } from "@/lib/content";
import {
  G21,
  G21_CATEGORIES,
  G21_MAX_QUESTIONS,
  G21_QUESTION_FIELD,
  type G21Category,
  type G21Setup,
  type G21State,
} from "@/lib/engine/g21";
import { countNoun, ROUND_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { PrivateView } from "./shared/timer";
import { useSession } from "./useSession";

const CATEGORY_LABEL: Record<G21Category, string> = {
  home: "البيت",
  kitchen: "المطبخ",
  outdoors: "في الخارج",
  food: "طعام",
  animals: "حيوانات",
  things: "أشياء",
};
const ROUND_CHOICES = [2, 4] as const;

/** G21 — Twenty Questions (FR-G21). The chooser hides a word; the counter never leaves 0…20. */
export function G21Play({ game }: { game: GameMeta }) {
  const [categories, setCategories] = useState<G21Category[]>([...G21_CATEGORIES]);
  const [rounds, setRounds] = useState<2 | 4>(2);
  const [session, setSession] = useState<{ setup: G21Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  const toggle = (c: G21Category) =>
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G21.availableCount(G21_CARDS, { categories, rounds })}
        requested={rounds}
        onStart={(aliases) =>
          setSession({ setup: { aliases, categories, rounds }, seen: readSeen(game.id) })
        }
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">أنواع الكلمات</legend>
          <div className="flex flex-wrap gap-2">
            {G21_CATEGORIES.map((c) => (
              <Chip
                key={c}
                pressed={categories.includes(c)}
                onToggle={() => toggle(c)}
                hue={game.hue}
              >
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">عدد الجولات</legend>
          <div className="flex gap-2">
            {ROUND_CHOICES.map((n) => (
              <Chip key={n} pressed={rounds === n} onToggle={() => setRounds(n)} hue={game.hue}>
                <Num value={n} /> {countNoun(n, ROUND_FORMS)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <p className="rounded-card bg-card p-4 text-ink-soft">
          جولة لكلٍّ منكما. الأسئلة تُقال بصوتكما، وتُجاب بنعم أو لا فقط.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G21Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G21, G21_CARDS, setup, seen);
  const { aliases, phase, chooser, questions } = state;
  const card = state.deck[state.roundIndex];
  const guesser = chooser === "A" ? aliases.B : aliases.A;
  const last = state.completedRounds[state.completedRounds.length - 1];
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";
  const left = G21_MAX_QUESTIONS - questions;

  return (
    <SessionFrame
      game={game}
      live={phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.roundIndex + 1, total: state.deck.length } : undefined}
    >
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {phase === "private_view" && card ? (
        <PrivateView
          key={card.id}
          toName={aliases[chooser]}
          headline={`${aliases[chooser]}: هذه كلمتك السرّية`}
          startLabel="أخفِ الكلمة وابدأ"
          onStart={() => send({ type: "READY" })}
          onSkip={() => send({ type: "SKIP" })}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold font-display text-3xl leading-snug">{card.body}</p>
            <FavoriteButton kind="card" id={card.id} />
          </div>
          <p className="text-ink-soft text-sm">
            أجب عن أسئلة {guesser} بنعم أو لا فقط، وسجّل كل سؤال بالعدّاد.
          </p>
        </PrivateView>
      ) : null}

      {/* Counting screen — the word is deliberately absent from the DOM here. */}
      {phase === "playing" ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {guesser} يسأل، و{aliases[chooser]} يجيب بنعم أو لا
          </p>
          <div className="flex flex-col items-center gap-2 rounded-card bg-card p-6 text-center shadow-[var(--shadow-deck)]">
            <p className="font-bold font-display text-7xl tabular-nums leading-none">
              <Num value={questions} />
            </p>
            <p role="status" aria-live="polite" className="font-semibold text-ink-soft">
              {left === 0 ? (
                "انتهت الأسئلة العشرون"
              ) : (
                <>
                  بقي <Num value={left} /> من <Num value={G21_MAX_QUESTIONS} />
                </>
              )}
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Button
              fullWidth
              disabled={left === 0}
              onClick={() => send({ type: "INPUT", field: G21_QUESTION_FIELD, value: "" })}
            >
              +<Num value={1} /> سؤال
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={questions === 0}
              onClick={() => send({ type: "UNDO" })}
            >
              تراجع خطوة
            </Button>
            <div className="flex gap-2">
              <Button fullWidth onClick={() => send({ type: "CORRECT" })}>
                خمّنها!
              </Button>
              <Button variant="secondary" fullWidth onClick={() => send({ type: "WRONG" })}>
                لم يخمّنها
              </Button>
            </div>
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي
            </Button>
          </div>
        </div>
      ) : null}

      {/* Reveal — the one intentional moment the word is shown. */}
      {phase === "reveal" && card && last ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft">الكلمة كانت</p>
          <div className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
            <p className="font-bold font-display text-3xl leading-snug">{card.body}</p>
            <p
              role="status"
              aria-live="polite"
              className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
                last.guessed
                  ? "border-mint bg-mint-soft text-ink"
                  : "border-line bg-ground text-ink"
              }`}
            >
              {last.guessed ? "خمّنها" : "لم يخمّنها"}
            </p>
            <p className="text-ink-soft">{afterQuestions(last.questions)}</p>
          </div>
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
            التالي
          </Button>
        </div>
      ) : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

const QUESTION_FORMS = { one: "سؤال", two: "سؤالين", few: "أسئلة", many: "سؤالاً" };

/** Arabic count agreement: none/singular/dual read without a numeral. */
const afterQuestions = (n: number) =>
  n === 0 ? (
    "بلا أي سؤال"
  ) : n === 1 ? (
    "بعد سؤال واحد"
  ) : n === 2 ? (
    "بعد سؤالين"
  ) : (
    <>
      بعد <Num value={n} /> {countNoun(n, QUESTION_FORMS)}
    </>
  );

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G21State;
  onReplay: () => void;
}) {
  const r = G21.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title={r.completed === 0 ? "انتهت الجلسة" : `خمّنتما ${r.guessed} من ${r.completed}`}
      note={
        r.completed === 0
          ? "لم تُكتمل أي جولة بعد."
          : state.endedEarly
            ? "خلاصة الجولات المكتملة فقط."
            : undefined
      }
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "كلمات مُخمَّنة", value: <Num value={r.guessed} /> },
          { label: "مجموع الأسئلة", value: <Num value={r.questions} /> },
          ...(r.averageQuestions === null
            ? []
            : [{ label: "متوسّط الأسئلة للجولة", value: <Num value={r.averageQuestions} /> }]),
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
