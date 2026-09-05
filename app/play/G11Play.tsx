"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G11_CARDS } from "@/lib/content";
import { G11, type G11Setup, type G11State } from "@/lib/engine/g11";
import { remainingMs } from "@/lib/engine/perform";
import { countNoun, ROUND_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { Countdown, PrivateView, useTimerLoop } from "./shared/timer";
import { useSession } from "./useSession";

const ROUND_CHOICES = [6, 10] as const;

/** Arabic count-noun forms for the results title (1 and 2 never take the numeral). */
const WORD_FORMS = { one: "كلمة واحدة", two: "كلمتين", few: "كلمات", many: "كلمة" };

/** Why a card was skipped. Session memory only — never written to storage (DATA-01). */
const REASONS = { forbidden: "قلتُ كلمة ممنوعة", hard: "صعبة جداً" } as const;
type Reason = keyof typeof REASONS;

/** G11 — Explain Without These Words (FR-G11). 60 seconds per card; the explainer alternates. */
export function G11Play({ game }: { game: GameMeta }) {
  const [rounds, setRounds] = useState<6 | 10>(6);
  const [session, setSession] = useState<{ setup: G11Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G11.availableCount(G11_CARDS, { rounds })}
        requested={rounds}
        onStart={(aliases) => setSession({ setup: { aliases, rounds }, seen: readSeen(game.id) })}
      >
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
          دقيقة لكل كلمة. الشرح بالكلام فقط، بلا إشارات وبلا حروف، وبلا الكلمات الثلاث الممنوعة.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G11Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G11, G11_CARDS, setup, seen);
  const { aliases, phase, performer } = state;
  const card = state.deck[state.roundIndex];
  const guesser = performer === "A" ? aliases.B : aliases.A;
  const now = useTimerLoop(phase, send);
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";
  const inTimer = phase.startsWith("timer_");

  // ponytail: skip reasons live for this session only; a saved history would need useGameData.
  const [reason, setReason] = useState<Reason | null>(null);
  const [reasonCounts, setReasonCounts] = useState<Record<Reason, number>>({
    forbidden: 0,
    hard: 0,
  });
  const skip = () => {
    if (reason) setReasonCounts((c) => ({ ...c, [reason]: c[reason] + 1 }));
    setReason(null);
    send({ type: "SKIP" });
  };
  const correct = () => {
    setReason(null);
    send({ type: "CORRECT" });
  };

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
          headline={`${aliases[performer]}: اشرح هذه الكلمة`}
          startLabel="أخفِ البطاقة وابدأ"
          onStart={() => send({ type: "READY", now: Date.now() })}
          onSkip={skip}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold font-display text-3xl leading-snug">{card.body}</p>
            <FavoriteButton kind="card" id={card.id} />
          </div>
          <div className="rounded-xl bg-ground p-4">
            <p className="font-semibold text-ink-soft text-sm">ممنوع أن تقول:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {card.forbidden.map((w) => (
                <li
                  key={w}
                  className="rounded-chip border border-line bg-card px-3 py-1 font-semibold text-danger"
                >
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </PrivateView>
      ) : null}

      {/* Timer screen — faces the guesser: neither the target nor the forbidden words appear. */}
      {inTimer ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {aliases[performer]} يشرح، و{guesser} يخمّن
          </p>
          <div className="flex flex-col items-center gap-2 rounded-card bg-card p-6 text-center shadow-[var(--shadow-deck)]">
            <p className="font-display font-semibold text-2xl">البطاقة مخفيّة الآن</p>
            <p className="text-ink-soft">استمعا للشرح، ثم سجّلا النتيجة.</p>
          </div>
          <Countdown ms={remainingMs(state, now)} phase={phase} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-ink-soft text-sm">سبب التخطّي (اختياري)</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REASONS) as Reason[]).map((r) => (
                <Chip
                  key={r}
                  pressed={reason === r}
                  onToggle={() => setReason((cur) => (cur === r ? null : r))}
                  hue={game.hue}
                >
                  {REASONS[r]}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={correct}>
              خمّنها
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
            <Button variant="ghost" fullWidth onClick={skip}>
              تخطّي
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "results" ? (
        <Results game={game} state={state} reasons={reasonCounts} onReplay={restart} />
      ) : null}
    </SessionFrame>
  );
}

function Results({
  game,
  state,
  reasons,
  onReplay,
}: {
  game: GameMeta;
  state: G11State;
  reasons: Record<Reason, number>;
  onReplay: () => void;
}) {
  const r = G11.deriveResult(state);
  const { aliases } = state;
  return (
    <ResultShell
      game={game}
      title={r.correct === 0 ? "انتهت الجلسة" : `خمّنتما ${countNoun(r.correct, WORD_FORMS)}`}
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
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
          ...(reasons.forbidden
            ? [{ label: REASONS.forbidden, value: <Num value={reasons.forbidden} /> }]
            : []),
          ...(reasons.hard ? [{ label: REASONS.hard, value: <Num value={reasons.hard} /> }] : []),
        ]}
      />
    </ResultShell>
  );
}
