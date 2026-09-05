import type { Metadata } from "next";
import { HomeScreen } from "./HomeScreen";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <HomeScreen />;
}
