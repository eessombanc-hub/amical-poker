/**
 * Limiteur de débit simple et sans dépendance externe, utilisé comme
 * première ligne de défense contre les abus évidents (force brute sur la
 * connexion, rafales de demandes sur les formulaires publics).
 *
 * Implémentation en mémoire (fenêtre fixe), à l'échelle d'une seule instance
 * de fonction serverless : suffisant pour un site de la taille de celui du
 * club, mais pas une garantie absolue si Vercel répartit un pic de trafic
 * entre plusieurs instances. Un pare-feu au niveau plateforme (Vercel
 * Firewall) resterait la solution la plus robuste si le besoin s'en faisait
 * sentir.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Retourne `true` si `key` a dépassé `limit` occurrences sur la fenêtre
 * `windowMs` (en millisecondes) — auquel cas l'appelant doit refuser la
 * requête. Chaque appel compte comme une tentative.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

// Purge périodique des compteurs expirés, pour éviter une fuite mémoire si
// l'instance reste chaude longtemps.
if (typeof setInterval !== "undefined") {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 10 * 60 * 1000);
  (cleanup as any).unref?.();
}

/**
 * Extrait l'adresse IP du client à partir des en-têtes de la requête.
 * Accepte aussi bien un `Headers` (routes API classiques, `NextRequest`)
 * qu'un objet simple `{ [nom]: valeur }` (format utilisé en interne par
 * next-auth pour son callback `authorize`).
 */
export function extractIp(
  headers: Headers | Record<string, string | string[] | undefined> | null | undefined
): string {
  if (!headers) return "unknown";

  const get = (name: string): string | undefined => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name) ?? undefined;
    }
    const value = (headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") || "unknown";
}
