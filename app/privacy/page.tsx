import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "الخصوصية",
  alternates: { canonical: "/privacy" },
};

const KEYS = [
  { key: "settings_v1", what: "الصوت، تقليل الحركة، وخيار تذكّر البطاقات." },
  { key: "favorites_v1", what: "أرقام الألعاب والبطاقات المفضّلة." },
  { key: "seen_v1", what: "أرقام البطاقات المعروضة مع تاريخها، لثلاثين يوماً على الأكثر." },
];

export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-6">
      <PageHeader title="الخصوصية" lede="قصيرة، لأنه لا يوجد الكثير لنجمعه." />

      <Section title="لا حسابات">
        <p>لا تسجيل ولا بريد ولا رقم هاتف. تفتحان التطبيق وتلعبان.</p>
      </Section>

      <Section title="الإجابات تبقى في الصفحة">
        <p>
          كل ما تختارانه أو تقولانه أثناء اللعب يعيش في ذاكرة الصفحة فقط. عند مغادرة اللعبة أو تحديث
          الصفحة يُمسح كله. لا يُرسل إلى أيّ خادم ولا يُحفظ على الجهاز.
        </p>
      </Section>

      <Section title="ما يحفظه المتصفح">
        <p>ثلاثة سجلات صغيرة في تخزين المتصفح المحلي، بلا أسماء ولا إجابات ولا نتائج:</p>
        <ul className="mt-2 flex flex-col gap-2">
          {KEYS.map((k) => (
            <li
              key={k.key}
              className="flex flex-col rounded-card border border-line bg-card px-4 py-2"
            >
              <code className="ltr self-start font-mono text-ink-soft text-sm">{k.key}</code>
              <span>{k.what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          يمكنكما مسحها في أيّ وقت من{" "}
          <Link href="/settings" className="underline underline-offset-4">
            الإعدادات
          </Link>
          . هذه البيانات على هذا المتصفح فقط، ولا نملك نسخة منها.
        </p>
      </Section>

      <Section title="إخفاء الإجابة ليس تشفيراً">
        <p>
          حين تمرّران الهاتف، يخفي التطبيق إجابة الأول حتى يثبّت الثاني اختياره. هذا حاجز في الواجهة
          يمنع الكشف بالخطأ، لا أكثر. من يفتح أدوات المطوّر في المتصفح يستطيع رؤية ما في الذاكرة.
        </p>
      </Section>

      <Section title="لا تحليلات">
        <p>لا نستخدم أدوات تتبّع أو تحليلات في هذه النسخة، ولا نُرسل تقارير أعطال تحوي بياناتكما.</p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 leading-relaxed">
      <h2 className="font-display font-semibold text-ink text-lg">{title}</h2>
      <div className="text-ink">{children}</div>
    </section>
  );
}
