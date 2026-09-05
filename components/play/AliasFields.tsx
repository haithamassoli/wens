"use client";

/** Two optional aliases, ≤20 chars each (S04). Parent owns state. */
export function AliasFields({
  value,
  onChange,
}: {
  value: { A: string; B: string };
  onChange: (v: { A: string; B: string }) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">أسماؤكما (اختياري)</legend>
      {(["A", "B"] as const).map((p, i) => (
        <label key={p} className="flex flex-col gap-1 text-ink-soft text-sm">
          {i === 0 ? "اللاعب الأول" : "اللاعب الثاني"}
          <input
            type="text"
            maxLength={20}
            autoComplete="off"
            value={value[p]}
            onChange={(e) => onChange({ ...value, [p]: e.target.value })}
            placeholder={i === 0 ? "مثلاً: سارة" : "مثلاً: خالد"}
            className="min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-ink-faint"
          />
        </label>
      ))}
    </fieldset>
  );
}
