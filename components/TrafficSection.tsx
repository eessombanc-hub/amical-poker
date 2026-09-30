"use client";

import { useEffect, useState } from "react";

type TrafficBucket = { total: number; connected: number; hidden: number };

export type TrafficData = {
  today: TrafficBucket;
  sevenDays: TrafficBucket;
  thirtyDays: TrafficBucket;
  total: TrafficBucket;
};

const STORAGE_KEY = "apcv-espace-membre-trafic-masque";

/**
 * Bloc "Trafic du site" de /espace-membre (voir app/espace-membre/page.tsx,
 * réservé au bureau/responsables/admin) — repliable : un bouton
 * "Masquer"/"Afficher" permet à chacun de le cacher ou de le faire
 * réapparaître à sa guise. Le choix est mémorisé dans le navigateur
 * (localStorage), propre à cet appareil, sans rien changer pour les autres
 * responsables/bureau/admin ni pour les autres appareils de ce membre.
 */
export default function TrafficSection({ traffic }: { traffic: TrafficData }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Stockage indisponible (navigation privée, etc.) — reste affiché par défaut.
    }
  }, []);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Rien à faire : le choix ne sera simplement pas mémorisé sur cet appareil.
    }
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-ink">Trafic du site</h2>
        <button
          type="button"
          onClick={toggle}
          className="text-xs text-sage underline underline-offset-2 hover:text-ink"
        >
          {hidden ? "Afficher →" : "Masquer"}
        </button>
      </div>

      {!hidden && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: traffic.today, label: "Aujourd'hui" },
              { value: traffic.sevenDays, label: "7 derniers jours" },
              { value: traffic.thirtyDays, label: "30 derniers jours" },
              { value: traffic.total, label: "Depuis toujours" },
            ].map((s) => (
              <div
                key={s.label}
                className="card-hover bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm p-5 text-center"
              >
                <div className="font-serif font-bold text-2xl md:text-3xl text-forest-2">{s.value.total}</div>
                <div className="text-sage text-xs uppercase tracking-widest mt-1">{s.label}</div>
                <div className="text-[0.68rem] text-sage/70 mt-2">
                  {s.value.connected} connecté{s.value.connected > 1 ? "s" : ""} à leur espace ·{" "}
                  {s.value.hidden} caché{s.value.hidden > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[0.68rem] text-sage/70 mt-3">
            Nombre de pages vues, sans cookie ni donnée personnelle,
            compteur maison, distinct de Plausible déjà en place sur le
            site. « Connecté » = visite avec une session ouverte (membre
            ou invité identifié) ; « caché » = visiteur anonyme, non
            identifié.
          </p>
        </>
      )}
    </div>
  );
}
