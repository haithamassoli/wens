import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        icon={<Logo size={56} animate />}
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
