import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devenir membre",
  description:
    "Faites une demande d'adhésion à l'Amical Poker Club : choisissez votre pseudo, votre e-mail et votre mot de passe. Votre espace membre sera créé après validation par le bureau.",
};

export default function DemandeAdhesionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
