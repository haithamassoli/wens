import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "بلا اتصال",
  robots: { index: false, follow: false },
};

// Precached by the service worker and served when a navigation fails offline.
export default function OfflinePage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        title="لا يوجد اتصال"
        description="هذه الصفحة لم تُحفَظ بعد. الصفحات التي زرتماها من قبل تعمل بلا إنترنت."
        action={<Button href="/">العودة إلى الرئيسية</Button>}
      />
    </div>
  );
}
