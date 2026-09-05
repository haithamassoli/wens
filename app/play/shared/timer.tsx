"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { usePageHidden } from "@/components/play/SessionFrame";
import type { Event, Phase } from "@/lib/engine/types";
import { useSettings } from "@/lib/storage";

/** Short expiry beep via WebAudio (NFR-UX-04: only when the user turned sound on). */
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

/**
 * G09Play's timer loop, shared by G10/G11/G13: wall-clock TICKs while running, an automatic
 * PAUSE when the tab goes away (FR-CORE-05), and one beep on expiry. Returns `now` for display.
 */
export function useTimerLoop(phase: Phase | undefined, send: (e: Event) => void): number {
  const hidden = usePageHidden();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "timer_running") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      send({ type: "TICK", now: t });
    }, 250);
    return () => clearInterval(id);
  }, [phase, send]);

  // Hidden tab pauses; never auto-resumes (FR-CORE-05).
  useEffect(() => {
    if (hidden && phase === "timer_running") send({ type: "PAUSE", now: Date.now() });
  }, [hidden, phase, send]);

  useEffect(() => {
    if (phase === "timer_expired" && settings.sound) beep();
  }, [phase, settings.sound]);

  return now;
}

const STATUS: Partial<Record<Phase, string>> = {
  timer_running: "الوقت يجري",
  timer_paused: "المؤقّت متوقّف",
  timer_expired: "انتهى الوقت!",
};

/** Big countdown with a spoken-status line. */
export function Countdown({ ms, phase }: { ms: number; phase: Phase }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div
        className={`font-bold font-display text-7xl tabular-nums leading-none ${
          phase === "timer_expired" ? "text-danger" : ""
        }`}
      >
        <Num value={Math.ceil(ms / 1000)} />
      </div>
      <p aria-live="polite" className="min-h-6 font-semibold text-ink-soft">
        {STATUS[phase] ?? "المؤقّت لم يبدأ بعد"}
      </p>
    </div>
  );
}

/**
 * The performer's private stage (US-02, FR-CORE-05): the dark handoff curtain first, so the
 * other player can look away, then the secret itself with a single "hide it and start" button.
 * The secret is only ever mounted after «أنا مستعدّ», and never by the caller's timer screen.
 */
export function PrivateView({
  toName,
  headline,
  startLabel,
  onStart,
  onSkip,
  children,
}: {
  toName: string;
  headline: string;
  startLabel: string;
  onStart: () => void;
  onSkip: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // A new round remounts this component via `key`, so the curtain always comes back closed.
  if (!open) return <Handoff toName={toName} onReady={() => setOpen(true)} />;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="font-semibold text-ink-soft" aria-live="polite">
        {headline}
      </p>
      <div className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
        {children}
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <p className="text-center text-ink-faint text-sm">
          احفظها في ذهنك؛ لن تظهر على الشاشة بعد الآن.
        </p>
        <Button fullWidth onClick={onStart}>
          {startLabel}
        </Button>
        <Button variant="ghost" fullWidth onClick={onSkip}>
          تخطّي
        </Button>
      </div>
    </div>
  );
}
