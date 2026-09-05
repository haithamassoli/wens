"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G32_CARDS } from "@/lib/content";
import type { G32Card } from "@/lib/content/types";
import {
  canStartMission,
  customMission,
  MISSION_STEP_MAX,
  MISSION_TITLE_MAX,
  type Mission,
  missionFromCard,
  missionProgress,
  postponeMission,
  resumeMission,
  type StepKey,
  setMissionReviewDate,
  setMissionStepText,
  swapMissionSteps,
  toggleMissionStep,
} from "@/lib/engine/g32";
import { withDefaultAliases } from "@/lib/engine/types";
import { shuffle } from "@/lib/engine/util";
import type { GameMeta } from "@/lib/games";
import { useGameData } from "@/lib/storage";

const CATEGORY: Record<string, string> = {
  home: "البيت",
  food: "المطبخ",
  space: "ركن جديد",
  admin: "ترتيب وأوراق",
};
const STATE_LABEL: Record<Mission["state"], string> = {
  active: "قيد العمل",
  done: "أنجزناها",
  postponed: "مؤجَّلة",
};
const inputClass = "min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-ink";

export function G32Play({ game }: { game: GameMeta }) {
  // ponytail: one mission on one device. Convex sync (both phones, plus the optional
  // notifications the doc mentions) is the R3 upgrade; nothing here reminds anyone of anything.
  const [data, setData, hydrated] = useGameData("G32", { mission: null as Mission | null });
  const [aliases, setAliases] = useState({ A: "", B: "" });
  const [step, setStep] = useState<"setup" | "instructions" | "mission">("setup");
  const [title, setTitle] = useState("");
  const [confirming, setConfirming] = useState(false);

  const names = withDefaultAliases(aliases);
  const suggestions = useMemo(
    () => shuffle(G32_CARDS.filter((c) => c.status === "published")).slice(0, 5),
    [],
  );
  const mission = data.mission;
  const setMission = (m: Mission | null) => setData({ mission: m });
  const patch = (f: (m: Mission) => Mission) =>
    setData((d) => ({
      mission: d.mission ? f(d.mission) : null,
    }));

  if (step === "setup") {
    return (
      <SessionFrame game={game}>
        <form
          className="flex flex-1 flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("instructions");
          }}
        >
          <p className="text-ink-soft">{game.tagline}</p>
          <AliasFields value={aliases} onChange={setAliases} />
          <p className="text-ink-soft text-sm">
            المهمّة وخطوتاها تبقيان على هذا الجهاز. التقدّم مشترك: لا سجلّ لأحدكما على الآخر، ولا
            تذكيرات.
          </p>
          <Button type="submit" fullWidth className="mt-auto">
            هيّا
          </Button>
        </form>
      </SessionFrame>
    );
  }

  if (step === "instructions") {
    return (
      <SessionFrame game={game}>
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
          <Button fullWidth className="mt-auto" onClick={() => setStep("mission")}>
            اختارا المهمّة
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const bottom = (
    <div className="mt-auto flex flex-col gap-2 pt-2">
      <Button variant="secondary" fullWidth href={`/games/${game.slug}`}>
        العودة إلى اللعبة
      </Button>
      <Button variant="ghost" fullWidth href="/">
        الرئيسية
      </Button>
    </div>
  );

  if (!hydrated) {
    return (
      <SessionFrame game={game}>
        <p role="status" className="text-ink-soft">
          نفتح مهمّتكما…
        </p>
      </SessionFrame>
    );
  }

  if (!mission) {
    const pick = (card: G32Card) => setMission(missionFromCard(card));
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">مهمّة واحدة لهذا الأسبوع</h2>
          <ul className="flex flex-col gap-3">
            {suggestions.map((c) => (
              <li key={c.id} className="rounded-card bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Tag hue={game.hue}>{CATEGORY[c.category] ?? c.category}</Tag>
                    <p className="mt-2 font-display font-semibold text-lg">{c.body}</p>
                  </div>
                  <FavoriteButton kind="card" id={c.id} />
                </div>
                <ul className="mt-3 flex flex-col gap-1 text-ink-soft text-sm">
                  {c.steps.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
                <Button className="mt-3" onClick={() => pick(c)}>
                  نأخذ هذه
                </Button>
              </li>
            ))}
          </ul>

          <form
            className="flex flex-col gap-3 rounded-card bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const own = customMission(title);
              if (canStartMission(own)) setMission(own);
            }}
          >
            <label className="flex flex-col gap-1 text-ink-soft text-sm">
              أو اكتبا مهمّتكما بأنفسكما
              <input
                type="text"
                maxLength={MISSION_TITLE_MAX}
                autoComplete="off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: نرتّب رفّ الكتب"
                className={`${inputClass} placeholder:text-ink-faint`}
              />
            </label>
            <Button type="submit" fullWidth disabled={!canStartMission(customMission(title))}>
              ابدآ بها
            </Button>
          </form>
          {bottom}
        </div>
      </SessionFrame>
    );
  }

  const progress = missionProgress(mission);
  const stepRow = (key: StepKey, who: string) => {
    const s = mission[key];
    return (
      <div key={key} className="rounded-xl bg-ground p-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={s.done}
            disabled={mission.state === "postponed"}
            onChange={() => patch((m) => toggleMissionStep(m, key))}
            className="mt-1 size-6 shrink-0 accent-current"
            style={{ accentColor: game.hue }}
          />
          <span className="font-semibold">{who}</span>
        </label>
        <input
          type="text"
          maxLength={MISSION_STEP_MAX}
          autoComplete="off"
          value={s.text}
          onChange={(e) => patch((m) => setMissionStepText(m, key, e.target.value))}
          placeholder="ماذا يفعل في هذه الخطوة؟"
          aria-label={`خطوة ${who}`}
          className={`${inputClass} mt-2 placeholder:text-ink-faint`}
        />
      </div>
    );
  };

  return (
    <SessionFrame game={game}>
      <div className="flex flex-1 flex-col gap-6">
        <article
          className="card-in rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
          style={{ borderColor: game.hue }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Tag hue={game.hue}>{STATE_LABEL[mission.state]}</Tag>
            <Tag>
              <Num value={progress} /> من <Num value={2} />
            </Tag>
          </div>
          <h2 className="mt-3 font-bold font-display text-2xl leading-snug">{mission.title}</h2>
          <p aria-live="polite" className="mt-1 text-ink-soft">
            {mission.state === "postponed"
              ? "مؤجَّلة الآن، ولا بأس. أعيداها متى شئتما."
              : mission.state === "done"
                ? "أنجزتماها معاً."
                : progress === 1
                  ? "خطوة واحدة تمّت. الباقية بانتظاركما."
                  : "خطوتان أمامكما."}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            {stepRow("stepA", names.A)}
            {stepRow("stepB", names.B)}
          </div>

          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => patch(swapMissionSteps)}
            disabled={mission.state === "postponed"}
          >
            بدّلا الخطوتين بينكما
          </Button>

          <label className="mt-5 flex flex-col gap-1 text-ink-soft text-sm">
            موعد مراجعة (اختياري)
            <input
              type="date"
              value={mission.reviewDate ?? ""}
              onChange={(e) => patch((m) => setMissionReviewDate(m, e.target.value))}
              className={inputClass}
            />
          </label>
        </article>

        <div className="flex flex-col gap-2">
          {mission.state === "postponed" ? (
            <Button fullWidth onClick={() => patch(resumeMission)}>
              نعود إليها
            </Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={() => patch(postponeMission)}>
              نؤجّلها
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={() => setConfirming(true)}>
            نلغي المهمّة
          </Button>
        </div>

        {confirming ? (
          <div role="status" className="rounded-card border border-danger/40 bg-card p-5">
            <p className="font-semibold">نلغي «{mission.title}» ونبدأ من جديد؟</p>
            <p className="mt-1 text-ink-soft text-sm">ستُحذف الخطوتان وموعد المراجعة.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  setMission(null);
                  setConfirming(false);
                  setTitle("");
                }}
              >
                نعم، ألغياها
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                تراجعنا
              </Button>
            </div>
          </div>
        ) : null}

        {bottom}
      </div>
    </SessionFrame>
  );
}
