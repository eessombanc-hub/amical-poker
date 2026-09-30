"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = { href: string; label: string };

/**
 * Menu mobile/tablette (< lg) : bouton hamburger + panneau déroulant
 * reprenant les mêmes liens que la barre desktop. La barre desktop ne
 * s'affiche qu'à partir de lg (les onglets, en Playfair Display gras,
 * ne tiennent pas sur une seule ligne en dessous) — ce menu couvre donc
 * aussi les tablettes, pas seulement les téléphones.
 */
export default function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="flex flex-col justify-center items-center gap-[5px] w-9 h-9 -mr-1"
      >
        <span
          className={`block h-[2px] w-5 bg-ink rounded-full transition-transform duration-200 ${open ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span
          className={`block h-[2px] w-5 bg-ink rounded-full transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-[2px] w-5 bg-ink rounded-full transition-transform duration-200 ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-forest/25 shadow-lg px-6 py-2 flex flex-col max-h-[75vh] overflow-y-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-lumieres py-3 text-lg text-forest-2 active:text-[#8a6412] border-b border-ink/5 last:border-b-0"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
