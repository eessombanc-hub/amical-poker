import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion membre",
  robots: { index: false, follow: false },
};

export default function ConnexionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
