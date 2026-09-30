"use client";

import { useState } from "react";
import AvatarForm from "./AvatarForm";
import ProfileForm from "./ProfileForm";
import ChangePasswordForm from "./ChangePasswordForm";

/**
 * Regroupe "Votre avatar", "Votre identité" (mode membre) et le changement
 * de mot de passe derrière un bouton à bascule dans l'espace membre, pour ne
 * pas encombrer la page par défaut — voir app/espace-membre/page.tsx.
 */
export default function ProfileEditToggle({
  name,
  initialPhotoUrl,
  initialFirstName,
  initialLastName,
  initialNickname,
  initialBirthDate,
  initialPublicResults,
}: {
  name: string;
  initialPhotoUrl: string | null;
  initialFirstName: string;
  initialLastName: string;
  initialNickname: string;
  initialBirthDate: string;
  initialPublicResults: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm rounded-full px-4 py-2.5 text-sm font-medium hover:border-brass/50 transition-colors inline-flex items-center gap-2"
      >
        {open ? "Masquer mon profil ▲" : "✏️ Modifier mon avatar et mon identité"}
      </button>

      {open && (
        <div className="mt-5 grid md:grid-cols-2 gap-5 items-start">
          <AvatarForm name={name} initialPhotoUrl={initialPhotoUrl} />
          <ProfileForm
            mode="member"
            initialFirstName={initialFirstName}
            initialLastName={initialLastName}
            initialNickname={initialNickname}
            initialBirthDate={initialBirthDate}
            initialPublicResults={initialPublicResults}
          />
          <ChangePasswordForm />
        </div>
      )}
    </div>
  );
}
