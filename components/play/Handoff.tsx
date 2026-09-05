"use client";

import { Button } from "@/components/Button";

/** Covers Player A's input until Player B confirms they hold the device (US-02). */
export function Handoff({ toName, onReady }: { toName: string; onReady: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-card bg-ink p-8 text-center text-ground">
      <p className="text-ground/70 text-lg">مرّر الهاتف إلى</p>
      <p className="font-display font-extrabold text-4xl">{toName}</p>
      <p className="text-ground/70">لا تنظر إلى الشاشة قبل أن يضغط شريكك «أنا مستعدّ».</p>
      <Button onClick={onReady} fullWidth className="mt-2">
        أنا مستعدّ
      </Button>
    </div>
  );
}
