"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G10_CARDS } from "@/lib/content";
import type { CharadeLevel } from "@/lib/engine/g10";
import { G10, G10_LEVELS, G10_ROUNDS, type G10Setup, type G10State } from "@/lib/engine/g10";
import { remainingMs } from "@/lib/engine/perform";
import { countNoun } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { Countdown, PrivateView, useTimerLoop } from "./shared/timer";
import { useSession } from "./useSession";

const LEVEL_LABEL: Record<CharadeLevel, string> = { easy: "سهل", medium: "متوسّط", hard: "صعب" };

/** Arabic count-noun forms for the results title (1 and 2 never take the numeral). */
const WORD_FORMS = { one: "كلمة واحدة", two: "كلمتين", few: "كلمات", many: "كلمة" };

/** G10 — Silent Charades (FR-G10). Six 60-second turns; the actor alternates every round. */
export function G10Play({ game }: { game: GameMeta }) {
  const [levels, setLevels] = useState<CharadeLevel[]>([...G10_LEVELS]);
  const [session, setSession] = useState<{ setup: G10Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  const toggle = (l: CharadeLevel) =>
    setLevels((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G10.availableCount(G10_CARDS, { levels })}
        requested={G10_ROUNDS}
        onStart={(aliases) => setSession({ setup: { aliases, levels }, seen: readSeen(game.id) })}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">مستوى الصعوبة</legend>
          <div className="flex flex-wrap gap-2">
            {G10_LEVELS.map((l) => (
              <Chip key={l} pressed={levels.includes(l)} onToggle={() => toggle(l)} hue={game.hue}>
                {LEVEL_LABEL[l]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <p className="rounded-card bg-card p-4 text-ink-soft">
          <Num value={G10_ROUNDS} /> جولات: ثلاث لكلٍّ منكما، ودقيقة واحدة لكل كلمة. لا صوت ولا إشارة
          إلى الحروف.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G10Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G10, G10_CARDS, setup, seen);
  const { aliases, phase, performer } = state;
  const card = state.deck[state.roundIndex];
  const guesser = performer === "A" ? aliases.B : aliases.A;
  const now = useTimerLoop(phase, send);
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";
  const inTimer = phase.startsWith("timer_");

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
          toName={aliases[performer]}
          headline={`${aliases[performer]}: هذه كلمتك`}
          startLabel="أخفِ الكلمة وابدأ"
          onStart={() => send({ type: "READY", now: Date.now() })}
          onSkip={() => send({ type: "SKIP" })}
        >
          <div className="flex items-start justify-between gap-3">
            <Tag hue={game.hue}>{LEVEL_LABEL[card.category as CharadeLevel]}</Tag>
            <FavoriteButton kind="card" id={card.id} />
          </div>
          <p className="font-bold font-display text-3xl leading-snug">{card.body}</p>
          <p className="text-ink-soft text-sm">مثّلها بلا كلام وبلا أصوات وبلا إشارة إلى الحروف.</p>
        </PrivateView>
      ) : null}

      {/* Timer screen — faces the guesser, so the word is never rendered here. */}
      {inTimer ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {aliases[performer]} يمثّل، و{guesser} يخمّن
          </p>
          <div className="card-in flex flex-col items-center gap-2 rounded-card bg-card p-6 text-center shadow-[var(--shadow-deck)]">
            <p className="font-display font-semibold text-2xl">الكلمة مخفيّة الآن</p>
            <p className="text-ink-soft">شاهدا التمثيل، ثم سجّلا النتيجة.</p>
          </div>
          <Countdown ms={remainingMs(state, now)} phase={phase} />
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "CORRECT" })}>
              صحيح
            </Button>
            {phase === "timer_running" ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => send({ type: "PAUSE", now: Date.now() })}
              >
                إيقاف مؤقّت
              </Button>
            ) : null}
            {phase === "timer_paused" ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => send({ type: "RESUME", now: Date.now() })}
              >
                متابعة
              </Button>
            ) : null}
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي
            </Button>
          </div>
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
  state: G10State;
  onReplay: () => void;
}) {
  const r = G10.deriveResult(state);
  const { aliases } = state;
  return (
    <ResultShell
      game={game}
      title={r.correct === 0 ? "انتهت الجلسة" : `أصبتما ${countNoun(r.correct, WORD_FORMS)}`}
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
          { label: `نقاط ${aliases.A}`, value: <Num value={r.points.A} /> },
          { label: `نقاط ${aliases.B}`, value: <Num value={r.points.B} /> },
          { label: "كلمات صحيحة", value: <Num value={r.correct} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
