import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        title="هذه الصفحة غير موجودة"
        description="ربما تغيّر الرابط أو كُتب بشكل مختلف."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button href="/">العودة إلى الرئيسية</Button>
            <Button href="/games" variant="secondary">
              تصفّح الألعاب
            </Button>
          </div>
        }
      />
    </div>
  );
}
