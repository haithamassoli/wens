import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Catalog } from "./Catalog";

export const metadata: Metadata = {
  title: "الألعاب",
  alternates: { canonical: "/games" },
};

export default function GamesPage() {
  return (
    <>
      <PageHeader title="الألعاب" lede="ست ألعاب قصيرة، كلها على هاتف واحد وبلا تسجيل." />
      <Catalog />
    </>
  );
}
