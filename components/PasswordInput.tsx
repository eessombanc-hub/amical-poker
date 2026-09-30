"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";

/**
 * Champ mot de passe avec un bouton "Afficher/Masquer" pour voir la saisie
 * en clair — repris sur tous les formulaires du site (connexion, demandes
 * d'adhésion/invité, réinitialisation) pour éviter les erreurs de frappe.
 * `toggleColorClassName` permet d'adapter la couleur du bouton aux
 * formulaires à fond sombre (bg-forest, bg-white/10...) ; par défaut,
 * couleurs adaptées à un fond clair.
 */
const PasswordInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { toggleColorClassName?: string }
>(function PasswordInput({ className = "", toggleColorClassName, ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={`${className} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className={`absolute right-0 top-0 h-full px-3 text-[0.65rem] font-semibold tracking-wide uppercase transition-colors ${
          toggleColorClassName || "text-sage hover:text-ink"
        }`}
      >
        {visible ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
});

export default PasswordInput;
