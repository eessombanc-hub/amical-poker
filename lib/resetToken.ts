import { randomBytes, createHash } from "crypto";

/** Génère un jeton aléatoire (64 caractères hex) à mettre dans le lien envoyé par e-mail. */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** Empreinte SHA-256 du jeton — c'est cette valeur qui est stockée en base, jamais le jeton en clair. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure
