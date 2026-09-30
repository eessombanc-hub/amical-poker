"use client";

import { useState } from "react";

/** Petit calculateur pratique pour l'article "Cotes et outs" : applique la
 *  règle des 4 et des 2 puis compare au coût réel du suivi demandé par le
 *  pot. Purement client-side, aucune donnée envoyée nulle part. */
export default function OutsCalculator() {
  const [outs, setOuts] = useState(9);
  const [street, setStreet] = useState<"flop" | "turn">("flop");
  const [pot, setPot] = useState(100);
  const [toCall, setToCall] = useState(20);

  const winPct = Math.min(100, outs * (street === "flop" ? 4 : 2));
  const potAfterCall = pot + toCall;
  const requiredPct = toCall > 0 ? (toCall / potAfterCall) * 100 : 0;
  const isProfitable = winPct > requiredPct;

  return (
    <div className="my-8 border border-forest/20 bg-paper-dim rounded-lg p-6">
      <div className="text-[0.65rem] tracking-widest uppercase text-forest font-semibold mb-1">
        Outil
      </div>
      <h3 className="text-base font-serif font-semibold mb-4">Calculateur de cotes et d&apos;outs</h3>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Nombre d&apos;outs</label>
          <input
            type="number"
            min={0}
            max={20}
            value={outs}
            onChange={(e) => setOuts(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Après quel tour ?</label>
          <select
            value={street}
            onChange={(e) => setStreet(e.target.value as "flop" | "turn")}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="flop">Après le flop (2 cartes à venir), ×4</option>
            <option value="turn">Après le turn (1 carte à venir), ×2</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Taille du pot avant votre mise</label>
          <input
            type="number"
            min={0}
            value={pot}
            onChange={(e) => setPot(Math.max(0, Number(e.target.value) || 0))}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Mise à payer pour suivre</label>
          <input
            type="number"
            min={0}
            value={toCall}
            onChange={(e) => setToCall(Math.max(0, Number(e.target.value) || 0))}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-center">
        <div className="border border-ink/10 bg-white rounded-lg p-3">
          <div className="text-xl font-mono-club font-semibold">{winPct.toFixed(0)}%</div>
          <div className="text-[0.65rem] text-sage uppercase tracking-wide mt-0.5">Chances de réussite</div>
        </div>
        <div className="border border-ink/10 bg-white rounded-lg p-3">
          <div className="text-xl font-mono-club font-semibold">{requiredPct.toFixed(0)}%</div>
          <div className="text-[0.65rem] text-sage uppercase tracking-wide mt-0.5">Cote demandée par le pot</div>
        </div>
        <div className={`rounded-lg p-3 border ${isProfitable ? "border-forest bg-forest/10" : "border-crimson bg-crimson/[0.06]"}`}>
          <div className={`text-sm font-semibold ${isProfitable ? "text-forest" : "text-crimson"}`}>
            {isProfitable ? "Suivi rentable" : "Suivi déficitaire"}
          </div>
          <div className="text-[0.65rem] text-sage uppercase tracking-wide mt-0.5">en moyenne, sur la durée</div>
        </div>
      </div>
    </div>
  );
}
