"use client";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        title="حدث خلل غير متوقّع"
        description="لا شيء ضاع — كل ما تحفظانه محفوظ على هذا الهاتف. جرّبا مرّة أخرى."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => retry()}>أعد المحاولة</Button>
            <Button href="/" variant="secondary">
              الرئيسية
            </Button>
          </div>
        }
      />
      {error.digest ? (
        <p className="mt-4 text-center text-ink-faint text-sm">
          رمز الخطأ: <span className="ltr">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
