import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SettingsScreen } from "./SettingsScreen";

export const metadata: Metadata = { title: "الإعدادات", robots: { index: false, follow: true } };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="الإعدادات" />
      <SettingsScreen />
    </>
  );
}
