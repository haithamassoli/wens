"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Num } from "@/components/Num";
import type { GameMeta } from "@/lib/games";

interface Props {
  game: GameMeta;
  /** e.g. current round (1-based) and total; omit for setup/results */
  progress?: { current: number; total: number };
  /** Called when the user confirms leaving mid-session (FR-CORE-06). */
  onExit?: () => void;
  /** Whether leaving needs a confirmation (true while a session is live). */
  live?: boolean;
  children: ReactNode;
}

/**
 * Chrome for /play: header with game name + progress + exit, privacy curtain when the
 * page is hidden (FR-CORE-05), and a browser-Back guard while a session is live (US-02).
 */
export function SessionFrame({ game, progress, onExit, live = false, children }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const hidden = usePageHidden();

  // Back button: while live, swallow the pop and show the exit confirmation instead.
  useEffect(() => {
    if (!live) return;
    history.pushState({ wens: true }, "");
    const onPop = () => {
      history.pushState({ wens: true }, "");
      setConfirming(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [live]);

  const leave = () => {
    onExit?.();
    router.push(`/games/${game.slug}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: game.hue }}
          />
          <h1 className="truncate font-bold font-display text-xl">{game.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {progress ? (
            <span className="text-ink-soft text-sm" aria-live="polite">
              الجولة <Num value={progress.current} /> من <Num value={progress.total} />
            </span>
          ) : null}
          <Button
            variant="ghost"
            aria-label="خروج"
            onClick={() => (live ? setConfirming(true) : leave())}
            className="!min-h-11 !px-3"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </div>
      </header>

      {progress ? (
        <div
          className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-ground-deep"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round((progress.current / progress.total) * 100)}%`,
              backgroundColor: game.hue,
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col">{hidden && live ? <Curtain /> : children}</div>

      {confirming ? <ExitDialog onCancel={() => setConfirming(false)} onConfirm={leave} /> : null}
    </div>
  );
}

function Curtain() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-card bg-ground-deep p-8 text-center text-ink-soft">
      المحتوى مخفيّ أثناء ابتعادك عن الصفحة.
    </div>
  );
}

function ExitDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-card bg-card p-6 shadow-lift">
        <h2 id="exit-title" className="font-bold font-display text-2xl">
          إنهاء هذه الجلسة؟
        </h2>
        <p className="mt-2 text-ink-soft">
          إجابات الجولات مؤقّتة وتُمسح عند الخروج. ستظهر لكما خلاصة الجولات المكتملة فقط.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="danger" fullWidth onClick={onConfirm}>
            إنهاء الجلسة
          </Button>
          <Button variant="secondary" fullWidth onClick={onCancel} autoFocus>
            متابعة اللعب
          </Button>
        </div>
      </div>
    </div>
  );
}

/** True while document.visibilityState === "hidden" (FR-CORE-05). */
export function usePageHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const f = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  return hidden;
}
