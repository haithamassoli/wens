"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { G34_CARDS } from "@/lib/content";
import type { G34Card } from "@/lib/content/types";
import {
  type Funniest,
  G34,
  G34_ROUNDS,
  type G34Category,
  type G34Setup,
  type G34State,
  remaining,
  themesFor,
} from "@/lib/engine/g34";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen, useSettings } from "@/lib/storage";
import { Stats } from "./Setup";

const CATEGORIES: [G34Category, string][] = [
  ["home", "في البيت"],
  ["outside", "خارج البيت"],
  ["colours", "ألوان"],
  ["details", "تفاصيل"],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES) as Record<G34Category, string>;

const themes = (n: number) =>
  n === 1 ? (
    "موضوع واحد"
  ) : n === 2 ? (
    "موضوعان"
  ) : (
    <>
      <Num value={n} /> {n <= 10 ? "مواضيع" : "موضوعاً"}
    </>
  );

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Short expiry beep (NFR-UX-04: only when the user turned sound on). */
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

function ThemeCard({ card, who, hue }: { card: G34Card; who: string; hue: string }) {
  return (
    <article
      className="rounded-card border-t-8 bg-card p-5 shadow-[var(--shadow-deck)]"
      style={{ borderColor: hue }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Tag hue={hue}>{who}</Tag>
          <Tag>{CATEGORY_LABEL[card.category as G34Category] ?? card.category}</Tag>
        </div>
        <FavoriteButton kind="card" id={card.id} />
      </div>
      <p className="mt-3 font-bold font-display text-xl leading-snug">{card.body}</p>
      <p className="mt-2 text-ink-soft text-sm">{card.hint}</p>
    </article>
  );
}

export function G34Play({ game }: { game: GameMeta }) {
  const [aliases, setAliases] = useState({ A: "", B: "" });
  const [categories, setCategories] = useState<G34Category[]>([]);
  const setup: G34Setup = { aliases, categories };
  const available = G34.availableCount(G34_CARDS, setup);

  const [state, setState] = useState<G34State | null>(null);
  const send = useCallback((e: Event) => setState((s) => (s ? G34.reduce(s, e) : s)), []);
  const start = () =>
    setState(G34.initialState(G34.buildDeck(G34_CARDS, setup, readSeen("G34")), setup));

  const { settings } = useSettings();
  const hidden = usePageHidden();
  const phase = state?.phase;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "timer_running") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      send({ type: "TICK", now: t });
    }, 500);
    return () => clearInterval(id);
  }, [phase, send]);

  useEffect(() => {
    if (hidden && phase === "timer_running") send({ type: "PAUSE", now: Date.now() });
  }, [hidden, phase, send]);

  useEffect(() => {
    if (phase === "timer_expired" && settings.sound) beep();
  }, [phase, settings.sound]);

  useEffect(() => {
    if (state?.phase !== "results") return;
    const played = (state.completedRounds.length + state.skippedRounds.length) * 2;
    markSeen(
      "G34",
      state.deck.slice(0, played).map((c) => c.id),
    );
  }, [state]);

  if (!state) {
    const rounds = Math.min(G34_ROUNDS, Math.floor(available / 2));
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">قبل أن نبدأ</h2>
          <AliasFields value={aliases} onChange={setAliases} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">أنواع المواضيع (اتركاها فارغة لكلّها)</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(([c, text]) => (
                <Chip
                  key={c}
                  pressed={categories.includes(c)}
                  onToggle={() =>
                    setCategories((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))
                  }
                  hue={game.hue}
                >
                  {text}
                </Chip>
              ))}
            </div>
          </fieldset>
          <p role="status" className={rounds === 0 ? "font-semibold" : "text-ink-soft"}>
            {rounds === 0 ? (
              "لا تكفي المواضيع لجولة كاملة. أضيفا نوعاً آخر."
            ) : (
              <>
                متاح {themes(available)}، وسنلعب <Num value={rounds} />{" "}
                {rounds === 1 ? "جولة" : rounds === 2 ? "جولتين" : "جولات"}.
              </>
            )}
          </p>
          <p className="rounded-card bg-card p-4 text-ink-soft text-sm">
            التصوير يتمّ خارج التطبيق بتطبيق الكاميرا لديكما. لا نطلب إذن الكاميرا ولا الوصول إلى
            معرض الصور، ولا تُرفع أي صورة إلى أي مكان.
          </p>
          <Button fullWidth className="mt-auto" disabled={rounds === 0} onClick={start}>
            ابدآ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const names = state.aliases;

  if (state.phase === "results") {
    const { completed, skipped, rounds } = G34.deriveResult(state);
    const pickLabel: Record<Funniest, string> = {
      A: names.A,
      B: names.B,
      both: "كلتاهما",
    };
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={completed === 0 ? "لم تكتمل جولة بعد." : "صورٌ لن تتكرّر"}
          note={state.endedEarly ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما لعبتماه." : undefined}
          onReplay={start}
        >
          <div className="flex flex-col gap-4">
            <Stats
              rows={[
                { label: "جولات مكتملة", value: <Num value={completed} /> },
                { label: "متخطّاة", value: <Num value={skipped} /> },
              ]}
            />
            <ul className="flex flex-col gap-2">
              {rounds.map((r) => {
                const a = state.deck.find((c) => c.id === r.cardId);
                const b = state.deck.find((c) => c.id === r.cardIdB);
                return (
                  <li key={r.roundIndex} className="rounded-xl bg-ground p-3">
                    <p className="text-sm">
                      {names.A}: {a?.body} · {names.B}: {b?.body}
                    </p>
                    <p className="mt-1 font-semibold text-sm">الأطرف: {pickLabel[r.funniest]}</p>
                  </li>
                );
              })}
            </ul>
            <p className="text-ink-soft text-sm">لا نقاط ولا فائز؛ الاختيار كان لكما وحدكما.</p>
          </div>
        </ResultShell>
      </SessionFrame>
    );
  }

  if (state.phase === "instructions") {
    return (
      <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
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
          <p className="rounded-card bg-card p-4 text-ink-soft text-sm">
            صوّرا بتطبيق الكاميرا لديكما ثم أظهرا الصورة لشريككما على شاشتكما. التطبيق لا يفتح كاميرا
            ولا يرفع صورة.
          </p>
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "START" })}>
            مستعدّان؟
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const [themeA, themeB] = themesFor(state, state.roundIndex);
  const total = Math.floor(state.deck.length / 2);
  const left = remaining(state, now);
  const running = state.phase === "timer_running";
  const paused = state.phase === "timer_paused";
  const expired = state.phase === "timer_expired";

  return (
    <SessionFrame
      game={game}
      live
      progress={{ current: state.roundIndex + 1, total }}
      onExit={() => send({ type: "END" })}
    >
      <div className="flex flex-1 flex-col gap-4">
        <ThemeCard card={themeA} who={names.A} hue={game.hue} />
        <ThemeCard card={themeB} who={names.B} hue={game.hue} />

        {running || paused || expired ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <div
              className={`font-bold font-display text-6xl tabular-nums leading-none ${
                expired ? "text-danger" : ""
              }`}
            >
              <Num value={clock(left)} />
            </div>
            <p aria-live="polite" className="min-h-6 font-semibold text-ink-soft">
              {expired
                ? "انتهى الوقت! اعرضا ما التقطتماه."
                : paused
                  ? "المؤقّت متوقّف"
                  : "الوقت يمضي"}
            </p>
          </div>
        ) : null}

        {state.phase === "reveal" ? (
          <section className="rounded-card bg-card p-5">
            <h3 className="font-semibold">أيّ صورة كانت الأطرف؟</h3>
            <p className="mt-1 text-ink-soft text-sm">
              اعرضا الصورتين معاً واختارا بالاتفاق. لا حساب آلي ولا تقييم للوجوه.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["A", names.A],
                  ["B", names.B],
                  ["both", "كلتاهما"],
                ] as [Funniest, string][]
              ).map(([v, text]) => (
                <Chip
                  key={v}
                  pressed={state.choice === v}
                  onToggle={() => send({ type: "SET", key: "funniest", value: v })}
                  hue={game.hue}
                >
                  {text}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {state.phase === "card" ? (
            <>
              <Button fullWidth onClick={() => send({ type: "READY", now: Date.now() })}>
                ابدآ مؤقّت <Num value={15} /> دقيقة
              </Button>
              <Button variant="secondary" fullWidth onClick={() => send({ type: "DONE" })}>
                نعرض الصور (بلا مؤقّت)
              </Button>
            </>
          ) : null}
          {running ? (
            <>
              <Button fullWidth onClick={() => send({ type: "DONE" })}>
                نعرض الصور
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
          {paused ? (
            <>
              <Button fullWidth onClick={() => send({ type: "RESUME", now: Date.now() })}>
                متابعة
              </Button>
              <Button variant="secondary" fullWidth onClick={() => send({ type: "DONE" })}>
                نعرض الصور
              </Button>
            </>
          ) : null}
          {expired ? (
            <Button fullWidth onClick={() => send({ type: "DONE" })}>
              نعرض الصور
            </Button>
          ) : null}
          {state.phase === "reveal" ? (
            <Button
              fullWidth
              disabled={state.choice === null}
              onClick={() => send({ type: "NEXT" })}
            >
              {state.roundIndex + 1 >= total ? "أنهيا الجلسة" : "الجولة التالية"}
            </Button>
          ) : null}
          <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
            تخطّي
          </Button>
        </div>
      </div>
    </SessionFrame>
  );
}
