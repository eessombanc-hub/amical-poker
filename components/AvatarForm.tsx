"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024; // 8 Mo avant compression
const OUTPUT_SIZE = 256; // avatar carré, en pixels

/** Redimensionne/recadre une image en carré et la renvoie en data URI JPEG compressée. */
function fileToResizedDataUrl(file: File, size = OUTPUT_SIZE, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Ce fichier n'est pas une image valide."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Votre navigateur ne permet pas de traiter l'image."));
          return;
        }
        // Recadrage "cover" centré pour obtenir un carré, quel que soit le ratio d'origine.
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AvatarForm({
  name,
  initialPhotoUrl,
}: {
  name: string;
  initialPhotoUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl ?? "");
  const [preview, setPreview] = useState(initialPhotoUrl);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isImportedFile = photoUrl.startsWith("data:");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de resélectionner le même fichier ensuite
    if (!file) return;

    setError(null);
    setSaved(false);
    if (!file.type.startsWith("image/")) {
      setError("Merci de choisir un fichier image (JPG, PNG, WebP…).");
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setError("Cette image est trop lourde (8 Mo maximum).");
      return;
    }

    setImporting(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhotoUrl(dataUrl);
      setPreview(dataUrl);
    } catch (err: any) {
      setError(err?.message || "Impossible de traiter cette image.");
    } finally {
      setImporting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/member/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: photoUrl.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Impossible d'enregistrer cet avatar.");
      return;
    }
    setPreview(data.photoUrl);
    setSaved(true);
    router.refresh();
  }

  function clearImportedFile() {
    setPhotoUrl("");
    setPreview(null);
  }

  return (
    <div className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wide text-sage mb-3">Votre avatar</div>
      <div className="flex items-center gap-4 flex-wrap">
        <Avatar photoUrl={preview} name={name} size={56} />
        <div className="flex-1 min-w-[220px]">
          {isImportedFile ? (
            <div className="flex items-center gap-2 border border-forest/25 bg-forest/5 rounded px-3 py-2 text-sm text-forest-2">
              <span className="flex-1">Photo importée depuis votre appareil ✓</span>
              <button
                type="button"
                onClick={clearImportedFile}
                className="text-xs text-sage underline underline-offset-2 flex-shrink-0"
              >
                Retirer
              </button>
            </div>
          ) : (
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value);
                setSaved(false);
              }}
              placeholder="https://... (lien vers une image)"
              className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
            />
          )}
          <div className="flex items-center gap-3 mt-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="avatar-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="text-xs text-ink border border-ink/20 rounded px-3 py-1.5 font-medium hover:bg-paper-dim disabled:opacity-50"
            >
              {importing ? "Import en cours…" : "📷 Importer une photo depuis l'appareil"}
            </button>
          </div>
          <p className="text-[0.68rem] text-sage/70 mt-1.5">
            Collez un lien d&apos;image ou importez une photo depuis votre
            ordinateur/téléphone (recadrée et compressée automatiquement).
            Laissez vide pour revenir à vos initiales.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      {saved && !error && <p className="text-xs text-forest mt-3">Avatar mis à jour ✓</p>}
      <button
        onClick={handleSave}
        disabled={saving || importing}
        className="mt-4 bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer l'avatar"}
      </button>
    </div>
  );
}
