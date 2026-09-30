import { randomInt } from "crypto";

// Alphabet sans caractères ambigus (0/O, 1/l/I) pour un mot de passe
// temporaire facile à relire et à transmettre à l'oral si besoin.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Génère un mot de passe temporaire lisible (12 caractères). */
export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}
