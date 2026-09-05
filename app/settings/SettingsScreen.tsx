"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Toggle } from "@/components/Toggle";
import { clearAllAppData, clearSeen, useSettings, useStorageAvailable } from "@/lib/storage";

// TODO(owner): replace with the real feedback address before launch.
const FEEDBACK_EMAIL = "hello@example.com";

export function SettingsScreen() {
  const { settings, update, hydrated } = useSettings();
  const available = useStorageAvailable();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onClearSeen = () => {
    clearSeen();
    setNotice("تم مسح سجل البطاقات المعروضة.");
  };
  const onClearAll = () => {
    clearAllAppData();
    setConfirming(false);
    setNotice("تم مسح بيانات هذا الجهاز وإعادة الإعدادات إلى وضعها الأصلي.");
  };

  return (
    <div className="flex flex-col gap-8">
      {available ? null : (
        <p role="status" className="rounded-card border border-line bg-card p-4 text-ink-soft">
          الحفظ غير متاح على هذا المتصفح. ستعمل الإعدادات لهذه الزيارة فقط.
        </p>
      )}

      <section
        aria-labelledby="prefs-title"
        className="rounded-card border border-line bg-card px-5 py-2"
      >
        <h2 id="prefs-title" className="pt-3 font-display font-semibold text-ink text-lg">
          التفضيلات
        </h2>
        <div className="divide-y divide-line">
          <Toggle
            label="الصوت"
            description="مؤثرات خفيفة عند انتهاء المؤقّت أو ظهور النتيجة."
            checked={settings.sound}
            onChange={(v) => update({ sound: v })}
            disabled={!hydrated}
          />
          <Toggle
            label="تقليل الحركة"
            description="يوقف الانتقالات المتحرّكة في التطبيق."
            checked={settings.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
            disabled={!hydrated}
          />
          <Toggle
            label="تذكّر البطاقات المعروضة"
            description="يحفظ أرقام البطاقات فقط، لثلاثين يوماً، حتى لا تتكرّر بسرعة. لا يحفظ أيّ إجابة."
            checked={settings.trackSeen}
            onChange={(v) => update({ trackSeen: v })}
            disabled={!hydrated}
          />
        </div>
      </section>

      <section aria-labelledby="data-title" className="flex flex-col gap-3">
        <h2 id="data-title" className="font-display font-semibold text-ink text-lg">
          البيانات على هذا الجهاز
        </h2>
        <Button variant="secondary" onClick={onClearSeen} fullWidth>
          مسح سجل البطاقات
        </Button>

        {confirming ? (
          <fieldset className="flex min-w-0 flex-col gap-3 rounded-card border border-danger/40 bg-card p-4">
            <legend className="float-start mb-2 w-full font-semibold text-ink">
              هل تريدان مسح بيانات هذا الجهاز؟
            </legend>
            <p className="text-ink-soft">
              سيُزيل هذا المفضّلة والإعدادات وسجل البطاقات المعروضة من هذا المتصفح فقط. لا يؤثّر على
              مواقع أخرى، ولا يوجد لدينا نسخة لنستعيدها.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={onClearAll} className="flex-1">
                نعم، امسح
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </fieldset>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)} fullWidth>
            مسح بيانات هذا الجهاز
          </Button>
        )}

        {notice ? (
          <p role="status" className="text-ink-soft text-sm">
            {notice}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="privacy-title" className="flex flex-col gap-2">
        <h2 id="privacy-title" className="font-display font-semibold text-ink text-lg">
          الخصوصية
        </h2>
        <p className="text-ink-soft">
          لا حسابات، ولا تحليلات، والإجابات تبقى في ذاكرة الصفحة حتى تغادراها.
        </p>
        <Link href="/privacy" className="font-medium text-ink underline underline-offset-4">
          اقرأ صفحة الخصوصية
        </Link>
      </section>

      <section aria-labelledby="feedback-title" className="flex flex-col gap-2">
        <h2 id="feedback-title" className="font-display font-semibold text-ink text-lg">
          رأيكما يهمّنا
        </h2>
        <p className="text-ink-soft">
          اقتراح لعبة، خطأ لغوي، أو شيء لم يعمل كما توقّعتما؟ راسلانا. نرجو ألا تذكرا تفاصيل خاصة أو
          إجابات من جلساتكما.
        </p>
        <a
          href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("ملاحظة عن ونس")}`}
          className="ltr inline-block font-medium text-ink underline underline-offset-4"
        >
          {FEEDBACK_EMAIL}
        </a>
      </section>
    </div>
  );
}
