/**
 * Constantes partagées pour la rubrique "Stratégie & pédagogie poker" —
 * niveaux, styles et libellés. Le contenu des articles lui-même vit en base
 * (modèle StrategieArticle, voir prisma/schema.prisma) et se gère depuis
 * /admin/strategie ; ce fichier ne porte que ce qui reste commun au code
 * (affichage, quiz). L'ancien contenu codé en dur (lib/strategieContent.ts)
 * n'est plus utilisé mais reste en place pour référence/historique.
 */

export const STRATEGIE_LEVELS = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"] as const;
export type StrategieLevelValue = (typeof STRATEGIE_LEVELS)[number];

export const LEVEL_LABEL: Record<StrategieLevelValue, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
};

export const LEVEL_INTRO: Record<StrategieLevelValue, string> = {
  DEBUTANT: "Pour découvrir le jeu ou poser des bases solides avant votre première manche.",
  INTERMEDIAIRE: "Pour affiner ses décisions une fois les règles et le vocabulaire acquis.",
  AVANCE: "Pour les joueurs qui veulent lire la table au-delà de leurs propres cartes.",
};

export const levelStyles: Record<StrategieLevelValue, string> = {
  DEBUTANT: "bg-forest/10 text-forest border-forest/30",
  INTERMEDIAIRE: "bg-brass/15 text-[#8a6412] border-brass/40",
  AVANCE: "bg-burgundy/10 text-burgundy border-burgundy/30",
};

// Variante des badges de niveau utilisable directement sur fond sombre (ex.
// carte "à la une" de /strategie, posée sur le dégradé sombre du site) — la
// version claire ci-dessus (levelStyles), pensée pour une carte blanche,
// devient illisible sur fond sombre (le brun foncé d'INTERMEDIAIRE en
// particulier). Mêmes teintes de club, contraste inversé.
export const levelStylesDark: Record<StrategieLevelValue, string> = {
  DEBUTANT: "bg-forest/20 text-forest-glow border-forest/40",
  INTERMEDIAIRE: "bg-brass/20 text-brass-light border-brass/40",
  AVANCE: "bg-burgundy/20 text-burgundy border-burgundy/40",
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

/** Sérialise un quiz en texte éditable dans un simple textarea d'admin :
 *  une question par bloc, séparés par une ligne vide, l'option correcte
 *  préfixée par "* ". */
export function quizToText(quiz: QuizQuestion[] | null | undefined): string {
  if (!quiz || quiz.length === 0) return "";
  return quiz
    .map((q) => {
      const lines = [q.question];
      q.options.forEach((opt, i) => {
        lines.push(`${i === q.correctIndex ? "* " : ""}${opt}`);
      });
      return lines.join("\n");
    })
    .join("\n\n");
}

/** Parse le format texte ci-dessus vers un quiz structuré. Ignore les blocs
 *  incomplets (pas de question, pas d'option marquée comme correcte). */
export function textToQuiz(text: string): QuizQuestion[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const quiz: QuizQuestion[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue; // question + au moins 2 options
    const [question, ...optionLines] = lines;
    let correctIndex = -1;
    const options = optionLines.map((line, i) => {
      if (line.startsWith("* ")) {
        correctIndex = i;
        return line.slice(2).trim();
      }
      return line;
    });
    if (correctIndex === -1) continue;
    quiz.push({ question, options, correctIndex });
  }
  return quiz;
}
