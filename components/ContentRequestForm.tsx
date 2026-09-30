"use client";

import { useRef, useState } from "react";

type ContentRequestType = "ACTU_POKER" | "STRATEGIE" | "PHOTO_VIDEO";

const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo avant compression
const MAX_SIDE = 1200; // plus grand côté, en pixels, après redimensionnement

/** Redimensionne une image (sans la recadrer) et la renvoie en data URI JPEG
 *  compressée, envoyée ensuite comme "lien" — même principe que l'import de
 *  photo en galerie (cf. GalerieAdminPanel) ou d'avatar (cf. AvatarForm),
 *  avec une taille de sortie plus légère car il ne s'agit ici que d'une
 *  proposition transmise au bureau, pas d'une publication finale. */
function fileToResizedDataUrl(file: File, maxSide = MAX_SIDE, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Ce fichier n'est pas une image valide."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Votre navigateur ne permet pas de traiter l'image."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const TYPES: ContentRequestType[] = ["ACTU_POKER", "STRATEGIE", "PHOTO_VIDEO"];

const TYPE_LABEL: Record<ContentRequestType, string> = {
  ACTU_POKER: "Actu poker",
  STRATEGIE: "Article stratégie",
  PHOTO_VIDEO: "Photo ou vidéo",
};

const TYPE_HELP: Record<ContentRequestType, string> = {
  ACTU_POKER: "Une info du circuit, un résultat, une actu à relayer dans la Gazette Poker.",
  STRATEGIE: "Une idée d'article ou un texte à publier dans la rubrique Stratégie.",
  PHOTO_VIDEO: "Une photo ou une vidéo à ajouter à la Galerie — joignez un lien (Drive, réseau social…).",
};

const TITLE_LABEL: Record<ContentRequestType, string> = {
  ACTU_POKER: "Titre de l'actu",
  STRATEGIE: "Titre de l'article",
  PHOTO_VIDEO: "Titre / légende",
};

const DESCRIPTION_LABEL: Record<ContentRequestType, string> = {
  ACTU_POKER: "Résumé de l'actu",
  STRATEGIE: "Contenu ou idée d'article",
  PHOTO_VIDEO: "Contexte (date, manche concernée…)",
};

const LINK_LABEL: Record<ContentRequestType, string> = {
  ACTU_POKER: "Lien vers la source (optionnel)",
  STRATEGIE: "Lien (optionnel)",
  PHOTO_VIDEO: "Photo, ou lien vers la photo/vidéo",
};

// Formulaire de /proposer-contenu — un membre ne publie jamais directement
// dans la Gazette Poker, Stratégie ou la Galerie (réservé au bureau) : il
// transmet une proposition ici (voir app/api/content-requests/route.ts),
// traitée ensuite depuis /admin/demandes-contenu.
export default function ContentRequestForm({ initialType }: { initialType?: ContentRequestType }) {
  const [type, setType] = useState<ContentRequestType>(
    initialType && TYPES.includes(initialType) ? initialType : "ACTU_POKER"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImportedFile = link.startsWith("data:");

  async function processDroppedFile(file: File) {
    setDropHint(null);
    if (!file.type.startsWith("image/")) {
      // Pas d'hébergement vidéo sur le site : on ne peut pas transformer un
      // fichier vidéo en pièce jointe, seul un lien externe fonctionne.
      setDropHint(
        "Les vidéos ne peuvent pas être envoyées directement ici (trop volumineuses) : hébergez-la sur Drive, YouTube ou un réseau social, puis collez le lien dans ce champ."
      );
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setDropHint("Cette image est trop lourde (10 Mo maximum).");
      return;
    }
    setImporting(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setLink(dataUrl);
    } catch (err: any) {
      setDropHint(err?.message || "Impossible de traiter cette image.");
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processDroppedFile(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processDroppedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 3) {
      setError("Merci d'indiquer un titre d'au moins 3 caractères.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Merci de détailler un minimum votre proposition.");
      return;
    }
    if (type === "PHOTO_VIDEO" && !link.trim()) {
      setError("Merci d'indiquer un lien vers la photo ou la vidéo.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/content-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, description, link: link.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Impossible d'envoyer votre proposition.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="bg-forest/10 border border-forest/30 rounded-lg p-6 text-sm text-forest-2">
        Votre proposition a bien été transmise au bureau ✓ Un responsable ou
        un administrateur va l&apos;examiner et publiera le contenu si tout
        est bon.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper-dim border border-ink/10 text-ink p-9 rounded-lg">
      <div className="mb-5">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          Type de contenu
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ContentRequestType)}
          className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <p className="text-sage text-xs mt-1.5">{TYPE_HELP[type]}</p>
      </div>
      <div className="mb-4">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          {TITLE_LABEL[type]}
        </label>
        <input
          type="text"
          required
          minLength={3}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          {DESCRIPTION_LABEL[type]}
        </label>
        <textarea
          required
          minLength={10}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          {LINK_LABEL[type]}
        </label>

        {type === "PHOTO_VIDEO" ? (
          isImportedFile ? (
            <div className="flex items-center gap-2 border border-forest/25 bg-forest/5 rounded px-3.5 py-3 text-sm text-forest-2">
              <span className="flex-1">Photo importée depuis votre appareil ✓</span>
              <button
                type="button"
                onClick={() => setLink("")}
                className="text-xs text-sage underline underline-offset-2 flex-shrink-0"
              >
                Retirer
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded border-2 border-dashed p-3.5 transition-colors ${
                isDragging ? "border-forest bg-forest/5" : "border-ink/15"
              }`}
            >
              <input
                type="url"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://… (lien) — ou glissez une photo ici"
                className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm mb-2"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="text-xs border border-ink/20 rounded px-3 py-1.5 font-medium hover:bg-paper-dim disabled:opacity-50"
                >
                  {importing ? "Import…" : "📷 Depuis l'appareil"}
                </button>
                <span className="text-xs text-sage">
                  ou glissez-déposez une photo dans ce cadre
                </span>
              </div>
              {dropHint && <p className="text-xs text-burgundy mt-2">{dropHint}</p>}
            </div>
          )
        ) : (
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
          />
        )}
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-forest text-white font-semibold rounded px-4 py-3.5 text-sm mt-2 disabled:opacity-60"
      >
        {loading ? "Envoi…" : "→ Envoyer ma proposition"}
      </button>
    </form>
  );
}
