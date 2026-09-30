"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { detectVideoEmbed } from "@/lib/media";

type Photo = { id: string; photoUrl: string; caption: string | null };
type Video = { id: string; videoUrl: string; caption: string | null };
type Album = {
  id: string;
  title: string;
  type: "PHOTO" | "VIDEO";
  seasonId: string | null;
  photos: Photo[];
  videos: Video[];
};
type SeasonOption = { id: string; label: string };

const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo avant compression
const MAX_SIDE = 1600; // plus grand côté, en pixels, après redimensionnement

/** Redimensionne une image (sans la recadrer) et la renvoie en data URI JPEG
 *  compressée — même principe que l'import d'avatar (cf. AvatarForm), avec
 *  une taille de sortie adaptée à une photo de galerie plutôt qu'à une
 *  vignette carrée. */
function fileToResizedDataUrl(file: File, maxSide = MAX_SIDE, quality = 0.82): Promise<string> {
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

export default function GalerieAdminPanel({
  initialAlbums,
  seasons,
}: {
  initialAlbums: Album[];
  seasons: SeasonOption[];
}) {
  const router = useRouter();
  const [albums, setAlbums] = useState(initialAlbums);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"PHOTO" | "VIDEO">("PHOTO");
  const [newSeasonId, setNewSeasonId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteAlbumId, setConfirmDeleteAlbumId] = useState<string | null>(null);

  async function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), type: newType, seasonId: newSeasonId || null }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible de créer cet album.");
      return;
    }
    setAlbums((prev) => [...prev, data].sort((a, b) => a.title.localeCompare(b.title)));
    setNewTitle("");
    setNewType("PHOTO");
    setNewSeasonId("");
    router.refresh();
  }

  async function handleDeleteAlbum(id: string) {
    const res = await fetch(`/api/admin/albums/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteAlbumId(null);
    router.refresh();
  }

  function handlePhotoAdded(albumId: string, photo: Photo) {
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, photos: [...a.photos, photo] } : a))
    );
  }

  function handlePhotoDeleted(albumId: string, photoId: string) {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId ? { ...a, photos: a.photos.filter((p) => p.id !== photoId) } : a
      )
    );
  }

  function handleVideoAdded(albumId: string, video: Video) {
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, videos: [...a.videos, video] } : a))
    );
  }

  function handleVideoDeleted(albumId: string, videoId: string) {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId ? { ...a, videos: a.videos.filter((v) => v.id !== videoId) } : a
      )
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateAlbum} className="bg-white border border-ink/10 rounded-lg p-5 mb-8 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs uppercase tracking-wide text-sage mb-1">Nouvel album</label>
          <input
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex : Manche du 4 septembre"
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs uppercase tracking-wide text-sage mb-1">Type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "PHOTO" | "VIDEO")}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm bg-white"
          >
            <option value="PHOTO">📷 Album photo</option>
            <option value="VIDEO">🎬 Album vidéo</option>
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs uppercase tracking-wide text-sage mb-1">Saison (facultatif)</label>
          <select
            value={newSeasonId}
            onChange={(e) => setNewSeasonId(e.target.value)}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm bg-white"
          >
            <option value="">—</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-forest text-white px-5 py-2.5 rounded text-sm font-medium disabled:opacity-50"
        >
          {creating ? "Création…" : "Créer l'album"}
        </button>
      </form>

      <div className="space-y-8">
        {albums.map((album) =>
          album.type === "VIDEO" ? (
            <VideoAlbumCard
              key={album.id}
              album={album}
              confirmDelete={confirmDeleteAlbumId === album.id}
              onAskDelete={() => setConfirmDeleteAlbumId(album.id)}
              onCancelDelete={() => setConfirmDeleteAlbumId(null)}
              onDelete={() => handleDeleteAlbum(album.id)}
              onVideoAdded={(video) => handleVideoAdded(album.id, video)}
              onVideoDeleted={(videoId) => handleVideoDeleted(album.id, videoId)}
            />
          ) : (
            <AlbumCard
              key={album.id}
              album={album}
              confirmDelete={confirmDeleteAlbumId === album.id}
              onAskDelete={() => setConfirmDeleteAlbumId(album.id)}
              onCancelDelete={() => setConfirmDeleteAlbumId(null)}
              onDelete={() => handleDeleteAlbum(album.id)}
              onPhotoAdded={(photo) => handlePhotoAdded(album.id, photo)}
              onPhotoDeleted={(photoId) => handlePhotoDeleted(album.id, photoId)}
            />
          )
        )}
        {albums.length === 0 && (
          <p className="text-sage text-sm">Aucun album pour l&apos;instant, créez-en un ci-dessus.</p>
        )}
      </div>
    </div>
  );
}

function AlbumCard({
  album,
  confirmDelete,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onPhotoAdded,
  onPhotoDeleted,
}: {
  album: Album;
  confirmDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onPhotoAdded: (photo: Photo) => void;
  onPhotoDeleted: (photoId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isImportedFile = photoUrl.startsWith("data:");

  async function processFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Merci de choisir un fichier image (JPG, PNG, WebP…).");
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setError("Cette image est trop lourde (10 Mo maximum).");
      return;
    }
    setImporting(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhotoUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || "Impossible de traiter cette image.");
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleAddPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoUrl.trim()) {
      setError("Ajoutez un lien ou importez une photo.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/albums/${album.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: photoUrl.trim(), caption: caption.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'ajouter cette photo.");
      return;
    }
    onPhotoAdded(data);
    setPhotoUrl("");
    setCaption("");
  }

  async function handleDeletePhoto(photoId: string) {
    setBusyPhotoId(photoId);
    const res = await fetch(`/api/admin/photos/${photoId}`, { method: "DELETE" });
    setBusyPhotoId(null);
    if (!res.ok) return;
    onPhotoDeleted(photoId);
  }

  async function handleDeleteAlbum() {
    setBusy(true);
    await onDelete();
    setBusy(false);
  }

  return (
    <div className="border border-ink/10 rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-serif font-semibold">
          {album.title}
          <span className="text-xs text-sage font-sans font-normal ml-2">
            {album.photos.length} photo{album.photos.length > 1 ? "s" : ""}
          </span>
        </h2>
        {confirmDelete ? (
          <span className="flex items-center gap-2">
            <button
              onClick={handleDeleteAlbum}
              disabled={busy}
              className="text-xs text-white bg-burgundy rounded px-3 py-1.5 font-medium disabled:opacity-50"
            >
              {busy ? "…" : "Confirmer la suppression de l'album"}
            </button>
            <button onClick={onCancelDelete} className="text-xs text-sage underline underline-offset-2">
              Annuler
            </button>
          </span>
        ) : (
          <button onClick={onAskDelete} className="text-xs text-burgundy underline underline-offset-2">
            Supprimer l&apos;album
          </button>
        )}
      </div>

      {album.photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mb-4">
          {album.photos.map((p) => (
            <div key={p.id} className="relative group">
              <div
                className="aspect-square bg-paper-dim rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${p.photoUrl})` }}
                title={p.caption ?? undefined}
              />
              <button
                onClick={() => handleDeletePhoto(p.id)}
                disabled={busyPhotoId === p.id}
                className="absolute top-1 right-1 bg-noir/70 text-white text-[0.6rem] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
              >
                {busyPhotoId === p.id ? "…" : "Supprimer"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleAddPhoto}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-wrap items-end gap-2.5 border-t border-ink/10 pt-4 mt-1 rounded-lg transition-colors ${
          isDragging ? "border-2 border-dashed border-forest bg-forest/5 p-3" : ""
        }`}
      >
        <div className="flex-1 min-w-[200px]">
          {isImportedFile ? (
            <div className="flex items-center gap-2 border border-forest/25 bg-forest/5 rounded px-3 py-2 text-sm text-forest-2">
              <span className="flex-1">Photo importée depuis votre appareil ✓</span>
              <button type="button" onClick={() => setPhotoUrl("")} className="text-xs text-sage underline underline-offset-2 flex-shrink-0">
                Retirer
              </button>
            </div>
          ) : (
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://... (lien vers une image)"
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
            />
          )}
        </div>
        <div className="min-w-[160px]">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Légende (facultatif)"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id={`photo-file-input-${album.id}`}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="text-xs border border-ink/20 rounded px-3 py-2 font-medium hover:bg-paper-dim disabled:opacity-50"
        >
          {importing ? "Import…" : "📷 Depuis l'appareil"}
        </button>
        <span className="text-xs text-sage w-full sm:w-auto">
          ou glissez-déposez une photo n&apos;importe où dans ce cadre
        </span>
        <button
          type="submit"
          disabled={saving || importing}
          className="bg-forest text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Ajout…" : "Ajouter"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

/** Miniature d'une vidéo (embed YouTube/Vimeo ou balise <video>) — voir lib/media.ts. */
function VideoThumb({ video }: { video: Video }) {
  const embed = detectVideoEmbed(video.videoUrl);
  if (embed.kind === "direct") {
    return (
      <video
        src={video.videoUrl}
        className="w-full h-full object-cover"
        muted
        preload="metadata"
      />
    );
  }
  return (
    <iframe
      src={embed.embedUrl}
      className="w-full h-full pointer-events-none"
      title={video.caption ?? "Vidéo"}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
  );
}

function VideoAlbumCard({
  album,
  confirmDelete,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onVideoAdded,
  onVideoDeleted,
}: {
  album: Album;
  confirmDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onVideoAdded: (video: Video) => void;
  onVideoDeleted: (videoId: string) => void;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError("Ajoutez un lien vidéo (YouTube, Vimeo ou fichier .mp4).");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/albums/${album.id}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: videoUrl.trim(), caption: caption.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'ajouter cette vidéo.");
      return;
    }
    onVideoAdded(data);
    setVideoUrl("");
    setCaption("");
  }

  async function handleDeleteVideo(videoId: string) {
    setBusyVideoId(videoId);
    const res = await fetch(`/api/admin/videos/${videoId}`, { method: "DELETE" });
    setBusyVideoId(null);
    if (!res.ok) return;
    onVideoDeleted(videoId);
  }

  async function handleDeleteAlbum() {
    setBusy(true);
    await onDelete();
    setBusy(false);
  }

  return (
    <div className="border border-ink/10 rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-serif font-semibold">
          🎬 {album.title}
          <span className="text-xs text-sage font-sans font-normal ml-2">
            {album.videos.length} vidéo{album.videos.length > 1 ? "s" : ""}
          </span>
        </h2>
        {confirmDelete ? (
          <span className="flex items-center gap-2">
            <button
              onClick={handleDeleteAlbum}
              disabled={busy}
              className="text-xs text-white bg-burgundy rounded px-3 py-1.5 font-medium disabled:opacity-50"
            >
              {busy ? "…" : "Confirmer la suppression de l'album"}
            </button>
            <button onClick={onCancelDelete} className="text-xs text-sage underline underline-offset-2">
              Annuler
            </button>
          </span>
        ) : (
          <button onClick={onAskDelete} className="text-xs text-burgundy underline underline-offset-2">
            Supprimer l&apos;album
          </button>
        )}
      </div>

      {album.videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-4">
          {album.videos.map((v) => (
            <div key={v.id} className="relative group">
              <div className="aspect-video bg-noir rounded-lg overflow-hidden">
                <VideoThumb video={v} />
              </div>
              <button
                onClick={() => handleDeleteVideo(v.id)}
                disabled={busyVideoId === v.id}
                className="absolute top-1 right-1 bg-noir/70 text-white text-[0.6rem] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
              >
                {busyVideoId === v.id ? "…" : "Supprimer"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleAddVideo}
        className="flex flex-wrap items-end gap-2.5 border-t border-ink/10 pt-4 mt-1"
      >
        <div className="flex-1 min-w-[220px]">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://... (YouTube, Vimeo ou fichier .mp4)"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[160px]">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Légende (facultatif)"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-forest text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Ajout…" : "Ajouter"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
