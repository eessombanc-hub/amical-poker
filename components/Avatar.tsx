function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar rond : affiche la photo du membre si elle existe, sinon ses
 * initiales sur un fond dégradé du club. Utilisé dans la navigation et
 * dans l'espace membre pour garder un rendu identique partout.
 */
export default function Avatar({
  photoUrl,
  name,
  size = 32,
}: {
  photoUrl?: string | null;
  name: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0 border border-ink/10"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-forest to-forest-2 text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
