"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { Chip, Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G36_CARDS } from "@/lib/content";
import { G36, type G36Setup, type G36State } from "@/lib/engine/g36";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen, useGameData } from "@/lib/storage";

const CATEGORY: Record<string, string> = {
  family: "الأهل",
  neighbours: "الجيران",
  community: "المجتمع",
  home: "البيت",
};
const COST: Record<string, string> = { free: "بدون تكلفة", low: "تكلفة بسيطة" };

const ideas = (n: number) =>
  n === 1 ? (
    "فكرة واحدة مطابقة"
  ) : n === 2 ? (
    "فكرتان مطابقتان"
  ) : (
    <>
      <Num value={n} /> {n <= 10 ? "أفكار مطابقة" : "فكرة مطابقة"}
    </>
  );

/**
 * G36 — A Good Deed Together (FR-G36). Voluntary ideas, never a record of worship.
 * ponytail: the private «تمّ» list is device-local; syncing it between two phones would
 * need a backend, and the ideas doc deliberately does not ask for one.
 */
export function G36Play({ game }: { game: GameMeta }) {
  const [freeOnly, setFreeOnly] = useState(false);
  const setup: G36Setup = { freeOnly };
  const available = G36.availableCount(G36_CARDS, setup);

  const [state, setState] = useState<G36State | null>(null);
  const send = useCallback((e: Event) => setState((s) => (s ? G36.reduce(s, e) : s)), []);
  const start = () =>
    setState(G36.initialState(G36.buildDeck(G36_CARDS, setup, readSeen("G36")), setup));

  const [privateDone, setPrivateDone] = useGameData("G36", { done: [] as string[] });
  const [confirmingUndo, setConfirmingUndo] = useState(false);

  const selected = state?.selectedId
    ? state.deck.find((c) => c.id === state.selectedId)
    : undefined;
  const marked = selected ? privateDone.done.includes(selected.id) : false;

  const toggleDone = (id: string) => {
    if (privateDone.done.includes(id)) {
      setConfirmingUndo(true);
      return;
    }
    markSeen("G36", [id]);
    setPrivateDone((d) => ({ done: [...d.done, id] }));
  };

  if (!state) {
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">فكرة صغيرة نافعة</h2>
          <p className="text-ink-soft">{game.tagline}</p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">التكلفة</legend>
            <div>
              <Chip pressed={freeOnly} onToggle={() => setFreeOnly((v) => !v)} hue={game.hue}>
                بدون تكلفة
              </Chip>
            </div>
          </fieldset>
          <p role="status" className={available === 0 ? "font-semibold" : "text-ink-soft"}>
            {available === 0 ? "لا فكرة تطابق هذا الاختيار." : ideas(available)}
          </p>
          <p className="text-ink-soft text-sm">
            لا نقاط ولا سلاسل ولا مشاركة. اختياركما وحدكما، والتخطّي بلا أي عتب.
          </p>
          <Button fullWidth className="mt-auto" disabled={available === 0} onClick={start}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  if (state.phase === "results") {
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={selected && state.accepted ? "اتّفقتما على فكرة" : "انتهت الجلسة"}
          onReplay={start}
        >
          {selected && state.accepted ? (
            <p className="text-lg">{selected.body}</p>
          ) : (
            <p className="text-ink-soft">لا شيء يُسجَّل، ولا شيء يفوتكما.</p>
          )}
        </ResultShell>
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
                  className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white"
                  style={{ backgroundColor: game.hue }}
                >
                  <Num value={i + 1} />
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <h2 className="mt-auto text-center font-bold font-display text-3xl">مستعدّان؟</h2>
          <Button fullWidth onClick={() => send({ type: "START" })}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  return (
    <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
      <div className="flex flex-1 flex-col gap-6">
        {state.phase === "wheel_result" && selected ? (
          <article
            className="rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
            style={{ borderColor: game.hue }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold font-display text-2xl leading-snug">{selected.body}</p>
              <FavoriteButton kind="card" id={selected.id} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Tag hue={game.hue}>{CATEGORY[selected.category] ?? selected.category}</Tag>
              <Tag>{COST[selected.costTier]}</Tag>
              <Tag>
                <Num value={selected.minutes} /> دقيقة
              </Tag>
              {selected.materials.length === 0 ? (
                <Tag>بلا أدوات</Tag>
              ) : (
                selected.materials.map((m) => <Tag key={m}>يحتاج: {m}</Tag>)
              )}
            </div>
            {state.accepted ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-mint-soft p-4">
                <p role="status" className="text-center font-semibold">
                  اتّفقتما عليها. بالتوفيق.
                </p>
                <button
                  type="button"
                  aria-pressed={marked}
                  onClick={() => toggleDone(selected.id)}
                  className={`min-h-11 rounded-chip border px-4 font-medium ${
                    marked ? "border-ink bg-ink text-ground" : "border-line bg-card text-ink"
                  }`}
                >
                  {marked ? "تمّ ✓ (خاص بجهازكما)" : "علّمها «تمّ» (خاص بجهازكما)"}
                </button>
                <p className="text-center text-ink-soft text-xs">
                  لا يُطلب إثبات، ولا يُشارك شيء، ولا يُسجَّل أي عمل عبادي.
                </p>
              </div>
            ) : null}
          </article>
        ) : null}

        {state.exhausted ? (
          <div className="rounded-card bg-card p-6 text-center">
            <p className="font-semibold text-lg">عرضنا كل الأفكار المطابقة. نبدأ من جديد؟</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                fullWidth
                onClick={() => {
                  send({ type: "RESET_POOL" });
                  send({ type: "SPIN" });
                }}
              >
                نعم، من جديد
              </Button>
              <Button variant="secondary" fullWidth onClick={() => send({ type: "END" })}>
                لا، نكتفي
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {state.phase === "wheel_result" ? (
            <>
              {state.accepted ? null : (
                <Button fullWidth onClick={() => send({ type: "DONE" })}>
                  نقبل
                </Button>
              )}
              <Button
                variant={state.accepted ? "primary" : "secondary"}
                fullWidth
                onClick={() => send({ type: "SPIN" })}
              >
                فكرة أخرى
              </Button>
              <Button variant="ghost" fullWidth href={`/games/${game.slug}`}>
                العودة إلى اللعبة
              </Button>
            </>
          ) : state.exhausted ? null : (
            <Button fullWidth onClick={() => send({ type: "SPIN" })}>
              اعرضا فكرة
            </Button>
          )}
        </div>
      </div>

      {confirmingUndo && selected ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="undo-done-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-card bg-card p-6">
            <h2 id="undo-done-title" className="font-bold font-display text-2xl">
              إزالة علامة «تمّ»؟
            </h2>
            <p className="mt-2 text-ink-soft">ستُحذف هذه العلامة من جهازكما نهائياً.</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  setPrivateDone((d) => ({ done: d.done.filter((x) => x !== selected.id) }));
                  setConfirmingUndo(false);
                }}
              >
                نعم، أزِلها
              </Button>
              <Button
                variant="secondary"
                fullWidth
                autoFocus
                onClick={() => setConfirmingUndo(false)}
              >
                إبقاؤها
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SessionFrame>
  );
}
