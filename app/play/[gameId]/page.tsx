import { notFound } from "next/navigation";
import { GAMES, gameById } from "@/lib/games";
import { PlayScreen } from "../PlayScreen";

export function generateStaticParams() {
  return GAMES.map((g) => ({ gameId: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/play/[gameId]">) {
  const { gameId } = await params;
  return { title: gameById(gameId)?.name ?? "لعب" };
}

export default async function Page({ params }: PageProps<"/play/[gameId]">) {
  const { gameId } = await params;
  const game = gameById(gameId);
  if (!game) notFound();
  return <PlayScreen game={game} />;
}
