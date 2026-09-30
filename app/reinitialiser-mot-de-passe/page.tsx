import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ReinitialiserMotDePassePage() {
  return (
    <div className="px-7 py-14">
      <div className="max-w-md mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Espace privé
        </div>
        <h1 className="text-3xl mb-8">Nouveau mot de passe</h1>

        <Suspense fallback={<div className="text-sage text-sm">Chargement…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
