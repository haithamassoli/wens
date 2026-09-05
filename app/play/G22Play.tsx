"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { G22_CARDS } from "@/lib/content";
import {
  G22,
  G22_CATEGORIES,
  G22_SECONDS,
  type G22Setup,
  type G22State,
  g22RemainingMs,
  isLetter,
  judge,
  normalizeArabic,
} from "@/lib/engine";
import { countNoun, ROUND_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { readSeen, useSettings } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const LETTERS = G22_CARDS.filter((c) => isLetter(c) && c.status === "published");
const CATEGORIES = G22_CARDS.filter((c) => c.category === "category" && c.status === "published");
const INPUT =
  "min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-ink-faint disabled:opacity-60";

/** Short expiry beep via WebAudio (only when the user turned sound on). */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    /* no audio available: stay silent */
  }
}

/** G22 — Letter Challenge (FR-G22): setup letter + 3 categories → timed answers per player → joint review. */
export function G22Play({ game }: { game: GameMeta }) {
  const [letter, setLetter] = useState<string | null>(null);
  const [cats, setCats] = useState<string[]>(
    CATEGORIES.slice(0, G22_CATEGORIES).map((c) => c.body),
  );
  const [rounds, setRounds] = useState<3 | 5>(3);
  const [session, setSession] = useState<{ setup: G22Setup; seen: string[] } | null>(null);
  if (session) return <Session game={game} {...session} />;

  const ready = cats.length === G22_CATEGORIES;
  const toggleCat = (label: string) =>
    setCats((c) =>
      c.includes(label)
        ? c.filter((x) => x !== label)
        : c.length < G22_CATEGORIES
          ? [...c, label]
          : c,
    );
  const draft: G22Setup = { letter, categories: cats, rounds };

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G22.availableCount(G22_CARDS, draft)}
        requested={rounds}
        onStart={(aliases) => {
          if (ready) setSession({ setup: { ...draft, aliases }, seen: readSeen(game.id) });
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">حرف الجولة الأولى</legend>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={letter === null} onToggle={() => setLetter(null)} hue={game.hue}>
              عشوائي
            </Chip>
            {LETTERS.map((c) => (
              <Chip
                key={c.id}
                pressed={letter === c.body}
                onToggle={() => setLetter(c.body)}
                hue={game.hue}
              >
                {c.body}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">
            الفئات (اختارا <Num value={G22_CATEGORIES} />)
          </legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                pressed={cats.includes(c.body)}
                onToggle={() => toggleCat(c.body)}
                hue={game.hue}
              >
                {c.body}
              </Chip>
            ))}
          </div>
          <p role="status" className={ready ? "text-ink-soft text-sm" : "font-semibold text-sm"}>
            {ready ? "الفئات جاهزة." : `اختارا ${G22_CATEGORIES} فئات للبدء.`}
          </p>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">عدد الجولات</legend>
          <div className="flex gap-2">
            {([3, 5] as const).map((n) => (
              <Chip key={n} pressed={rounds === n} onToggle={() => setRounds(n)} hue={game.hue}>
                <Num value={n} /> {countNoun(n, ROUND_FORMS)}
              </Chip>
            ))}
          </div>
        </fieldset>
      </SetupShell>
    </SessionFrame>
  );
}

function LetterCard({ state, hue }: { state: G22State; hue: string }) {
  const card = state.deck[state.roundIndex];
  return (
    <article
      className="rounded-card border-t-8 bg-card p-5 shadow-[var(--shadow-deck)]"
      style={{ borderColor: hue }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Tag hue={hue}>
            <Num value={G22_SECONDS} /> ثانية
          </Tag>
          {state.categories.map((c) => (
            <Tag key={c}>{c}</Tag>
          ))}
        </div>
        <FavoriteButton kind="card" id={card.id} />
      </div>
      <p className="mt-3 text-ink-soft">كلمات تبدأ بحرف</p>
      <p className="font-bold font-display text-6xl leading-none">{card.body}</p>
    </article>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G22Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G22, G22_CARDS, setup, seen);
  const { aliases, phase, writer } = state;
  const inRound = phase !== "instructions" && phase !== "results";
  const inTimer = phase.startsWith("timer_");
  const { settings } = useSettings();
  const hidden = usePageHidden();
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Wall-clock ticks: the engine locks the answers past zero; the display reads g22RemainingMs.
  useEffect(() => {
    if (phase !== "timer_running") return;
    setNow(Date.now()); // the mount-time `now` is stale: without this the first frame shows > 60 s
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (g22RemainingMs(stateRef.current, t) <= 0 && settings.sound) beep();
      send({ type: "TICK", now: t });
    }, 250);
    return () => clearInterval(id);
  }, [phase, send, settings.sound]);

  // Hidden tab pauses; never auto-resumes (FR-CORE-05).
  useEffect(() => {
    if (hidden && phase === "timer_running") send({ type: "PAUSE", now: Date.now() });
  }, [hidden, phase, send]);

  const seconds = Math.ceil(g22RemainingMs(state, now) / 1000);

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

      {inTimer ? (
        <div className="flex flex-1 flex-col gap-4">
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {phase === "timer_ready"
              ? `${aliases[writer]}: المؤقّت لم يبدأ بعد`
              : phase === "timer_paused"
                ? `${aliases[writer]}: المؤقّت متوقّف`
                : `${aliases[writer]}: اكتب!`}
          </p>
          <LetterCard state={state} hue={game.hue} />
          <div className="text-center font-bold font-display text-5xl tabular-nums leading-none">
            <Num value={seconds} />
          </div>
          {phase !== "timer_ready" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">الإجابات</legend>
              {state.categories.map((c, i) => (
                <label key={c} className="flex flex-col gap-1 text-ink-soft text-sm">
                  {c}
                  <input
                    type="text"
                    autoComplete="off"
                    disabled={phase !== "timer_running"}
                    value={state.answers[writer][i]}
                    onChange={(e) =>
                      send({ type: "INPUT", field: String(i), value: e.target.value })
                    }
                    className={INPUT}
                  />
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="mt-auto flex flex-col gap-2">
            {phase === "timer_ready" ? (
              <Button fullWidth onClick={() => send({ type: "READY", now: Date.now() })}>
                {aliases[writer]} مستعدّ
              </Button>
            ) : null}
            {phase === "timer_running" ? (
              <>
                <Button fullWidth onClick={() => send({ type: "LOCK", player: writer })}>
                  ثبّت
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => send({ type: "PAUSE", now: Date.now() })}
                >
                  إيقاف مؤقّت
                </Button>
              </>
            ) : null}
            {phase === "timer_paused" ? (
              <>
                <Button fullWidth onClick={() => send({ type: "RESUME", now: Date.now() })}>
                  متابعة
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => send({ type: "LOCK", player: writer })}
                >
                  ثبّت
                </Button>
              </>
            ) : null}
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي الجولة
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "handoff" ? (
        <Handoff toName={aliases.B} onReady={() => send({ type: "READY" })} />
      ) : null}

      {phase === "review" ? <Review state={state} send={send} /> : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

function Review({
  state,
  send,
}: {
  state: G22State;
  send: (e: Parameters<typeof G22.reduce>[1]) => void;
}) {
  const { aliases } = state;
  const { accepted, points } = judge(state);
  const card = state.deck[state.roundIndex];
  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="font-semibold text-ink-soft">
        راجعا الإجابات معاً على حرف «{card.body}». اضغطا على إجابة لقبولها أو رفضها.
      </p>
      <ul className="flex flex-col gap-3">
        {state.categories.map((c, i) => {
          const a = state.answers.A[i].trim();
          const b = state.answers.B[i].trim();
          const match = accepted.A[i] && accepted.B[i] && normalizeArabic(a) === normalizeArabic(b);
          return (
            <li key={c} className="flex flex-col gap-2 rounded-card bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{c}</span>
                <span className="text-ink-soft text-sm">{match ? "متطابقة" : "مختلفة"}</span>
              </div>
              {(["A", "B"] as const).map((p) => {
                const text = p === "A" ? a : b;
                const ok = accepted[p][i];
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={ok}
                    disabled={!text}
                    onClick={() => send({ type: "SET", key: `${p}:${i}`, value: ok ? "0" : "1" })}
                    className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-4 text-start disabled:opacity-60 ${
                      ok ? "border-mint bg-mint-soft" : "border-line bg-ground"
                    }`}
                  >
                    <span>
                      <span className="text-ink-soft text-sm">{aliases[p]}: </span>
                      {text || <span className="text-ink-faint">— فارغة</span>}
                    </span>
                    <span className="shrink-0 font-semibold text-sm">
                      {!text ? "0" : ok ? (match ? "5 · مقبول" : "10 · مقبول") : "0 · مرفوض"}
                    </span>
                  </button>
                );
              })}
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" className="font-semibold">
        هذه الجولة: {aliases.A} <Num value={points.A} /> – {aliases.B} <Num value={points.B} />
      </p>
      <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
        التالي
      </Button>
    </div>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G22State;
  onReplay: () => void;
}) {
  const r = G22.deriveResult(state);
  const { aliases } = state;
  const verdict =
    r.winner === null ? null : r.winner === "tie" ? "تعادل" : `الفائز: ${aliases[r.winner]}`;
  return (
    <ResultShell
      game={game}
      title={state.endedEarly ? "جلسة غير مكتملة" : "انتهت الجلسة"}
      note={r.completed === 0 ? "لم تُكتمل أي جولة بعد." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: `نقاط ${aliases.A}`, value: <Num value={r.points.A} /> },
          { label: `نقاط ${aliases.B}`, value: <Num value={r.points.B} /> },
          { label: "جولات مكتملة", value: <Num value={r.completed} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
      {verdict ? (
        <p role="status" className="mt-4 font-bold font-display text-2xl">
          {verdict}
        </p>
      ) : null}
    </ResultShell>
  );
}
