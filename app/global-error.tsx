"use client";

// Fires when the root layout itself throws, so it renders its own document.
// ponytail: inline styles on purpose — this must not depend on globals.css or next/font loading.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1rem",
          background: "#f3eef7",
          color: "#2a1a33",
          font: "16px/1.7 system-ui, sans-serif",
        }}
      >
        <title>حدث خلل · ونس</title>
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 .5rem" }}>حدث خلل غير متوقّع</h1>
          <p style={{ color: "#6b5a75", margin: "0 0 1.5rem" }}>
            لم يُفقد شيء — كل ما تحفظانه محفوظ على هذا الهاتف.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: "2.75rem",
              padding: "0 1.5rem",
              border: 0,
              borderRadius: "999px",
              background: "#f0a23b",
              color: "#2a1a33",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            أعد المحاولة
          </button>
          {error.digest ? (
            <p style={{ color: "#a898b3", fontSize: ".875rem", marginTop: "1rem" }}>
              رمز الخطأ: <span dir="ltr">{error.digest}</span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
