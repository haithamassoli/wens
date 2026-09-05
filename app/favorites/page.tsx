import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FavoritesScreen } from "./FavoritesScreen";

export const metadata: Metadata = { title: "المفضّلة" };

export default function FavoritesPage() {
  return (
    <>
      <PageHeader title="المفضّلة" lede="الألعاب والبطاقات التي أحببتماها." />
      <FavoritesScreen />
    </>
  );
}
