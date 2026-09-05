"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G35_CARDS } from "@/lib/content";
import {
  answerer,
  G35,
  G35_CATEGORIES,
  G35_ROUNDS,
  type G35Category,
  type G35Setup,
  type G35State,
} from "@/lib/engine/g35";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { ChoiceInput } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const TOPIC: Record<G35Category, string> = {
  seerah: "السيرة النبوية",
  quran: "سور القرآن",
  ethics: "الأخلاق والآداب",
};

/** G35 — Religious Knowledge Quiz (FR-G35): topics → 5 questions in turns → answer + source. */
export function G35Play({ game }: { game: GameMeta }) {
  const [categories, setCategories] = useState<G35Category[]>([...G35_CATEGORIES]);
  const [session, setSession] = useState<{ setup: G35Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  const toggle = (id: G35Category) =>
    setCategories((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      return next.length ? next : p; // at least one topic
    });

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G35.availableCount(G35_CARDS, { categories })}
        requested={G35_ROUNDS}
        onStart={(aliases) =>
          setSession({ setup: { categories, aliases }, seen: readSeen(game.id) })
        }
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">المواضيع</legend>
          <div className="flex flex-wrap gap-2">
            {G35_CATEGORIES.map((c) => (
              <Chip
                key={c}
                pressed={categories.includes(c)}
                onToggle={() => toggle(c)}
                hue={game.hue}
              >
                {TOPIC[c]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2 rounded-card bg-card p-4 text-ink-soft text-sm">
          <p>
            <Num value={G35_ROUNDS} /> أسئلة بالتناوب، وبعد كل سؤال تظهر الإجابة وشرح قصير والمصدر.
            النقاط للمتعة داخل اللعبة فقط.
          </p>
          <p>
            المحتوى مادة تحريرية مُراجَعة تقتصر على معلومات متّفق عليها، ونرحّب بأي تصويب عبر «رأيكما
            يهمّنا» في الإعدادات.
          </p>
        </div>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G35Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G35, G35_CARDS, setup, seen);
  const { aliases, phase } = state;
  const card = state.deck[state.roundIndex];
  const player = answerer(state.roundIndex);
  const last = state.completedRounds[state.completedRounds.length - 1];
  const inRound = card !== undefined && (phase === "input" || phase === "reveal");
  const points = G35.deriveResult(state).points;

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

      {phase === "input" && card ? (
        <ChoiceInput
          headline={`الدور على ${aliases[player]}`}
          cardId={card.id}
          body={card.body}
          options={card.options}
          selected={state.choice}
          hue={game.hue}
          onSelect={(optionId) => send({ type: "SUBMIT", player, optionId })}
          onLock={() => send({ type: "LOCK", player })}
          onSkip={() => send({ type: "SKIP" })}
        />
      ) : null}

      {phase === "reveal" && card && last ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-card bg-card p-5">
            <p
              role="status"
              className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
                last.correct ? "border-mint bg-mint-soft" : "border-line bg-ground"
              }`}
            >
              {last.correct ? "إجابة صحيحة" : "إجابة مختلفة"}
            </p>
            <p className="font-semibold">{card.body}</p>
            <p>
              <span className="text-ink-soft">الإجابة: </span>
              <span className="font-semibold">
                {card.options.find((o) => o.id === card.answer)?.label}
              </span>
            </p>
            <p className="text-ink-soft">{card.explanation}</p>
            <p className="border-line border-t pt-3 text-sm">
              <span className="font-semibold">المصدر: </span>
              {card.source}
            </p>
            <p className="text-ink-soft text-sm">
              {aliases.A} <Num value={points.A} /> – {aliases.B} <Num value={points.B} />
            </p>
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

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G35State;
  onReplay: () => void;
}) {
  const r = G35.deriveResult(state);
  const { aliases } = state;
  return (
    <ResultShell
      game={game}
      title="انتهت الجولة"
      note={
        r.completed === 0
          ? "لم يُجَب عن أي سؤال بعد."
          : "النقاط للمتعة داخل اللعبة فقط، والمعلومة هي المكسب."
      }
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: `نقاط ${aliases.A}`, value: <Num value={r.points.A} /> },
          { label: `نقاط ${aliases.B}`, value: <Num value={r.points.B} /> },
          { label: "أسئلة مكتملة", value: <Num value={r.completed} /> },
          { label: "أسئلة متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
