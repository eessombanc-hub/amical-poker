import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accès invité au forum",
  description:
    "Vous n'êtes pas membre de l'Amical Poker Club mais souhaitez suivre le forum ? Demandez un accès invité, validé par le bureau, sans adhésion au club.",
};

export default function DemandeInviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
