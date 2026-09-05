import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal Bastion — Endless Tower Defense",
  description:
    "Play Signal Bastion, an endless tower-defense clicker. Power the grid, build towers, defeat bosses, and climb the wave leaderboard.",
};

export default function SignalBastionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
