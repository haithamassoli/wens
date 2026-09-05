import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <EmptyState
        title="هذه الصفحة غير موجودة"
        description="ربما تغيّر الرابط أو كُتب بشكل مختلف."
        action={<Button href="/">العودة إلى الرئيسية</Button>}
      />
    </div>
  );
}
