"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-sage underline underline-offset-4"
    >
      Se déconnecter
    </button>
  );
}
