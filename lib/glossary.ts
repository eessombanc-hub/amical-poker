/**
 * Glossaire poker utilisé pour rendre les termes techniques survolables
 * (définition en infobulle) dans le corps des articles de /strategie, voir
 * components/GlossaryText.tsx. Reprend le contenu de l'article "Lexique du
 * poker : le vocabulaire à connaître".
 *
 * L'ordre compte : les termes les plus longs/spécifiques sont placés avant
 * les plus courts pour que la détection dans le texte préfère la meilleure
 * correspondance (ex. "petite blind" avant "blind").
 */
export const GLOSSARY: { term: string; definition: string }[] = [
  { term: "petite blind", definition: "Mise obligatoire, la plus petite des deux, postée avant les cartes par le joueur immédiatement à gauche du donneur." },
  { term: "grosse blind", definition: "Mise obligatoire, le double de la petite blind, postée avant les cartes par le second joueur à gauche du donneur." },
  { term: "blinds", definition: "Mises obligatoires postées avant la distribution des cartes par les deux joueurs situés à gauche du donneur, pour garantir qu'il y a toujours un pot à jouer." },
  { term: "all-in", definition: "Miser l'intégralité de son tapis de jetons en une seule fois. Un joueur all-in ne peut plus être relancé au-delà de son propre tapis." },
  { term: "tapis", definition: "L'ensemble des jetons dont dispose un joueur à un instant donné." },
  { term: "cave", definition: "La somme ou le nombre de jetons de départ engagés pour participer à un tournoi ou une table de cash game (aussi appelée buy-in)." },
  { term: "buy-in", definition: "La somme ou le nombre de jetons de départ engagés pour participer à un tournoi ou une table de cash game." },
  { term: "cote du pot", definition: "Le rapport entre la mise à payer et la taille du pot, utilisé pour décider si un suivi est rentable statistiquement sur la durée." },
  { term: "pot odds", definition: "Le rapport entre la mise à payer et la taille du pot, utilisé pour décider si un suivi est rentable statistiquement sur la durée." },
  { term: "outs", definition: "Les cartes restantes dans le paquet qui amélioreraient une main pour la rendre gagnante. Leur nombre sert à calculer ses chances de réussite avant la carte suivante." },
  { term: "tilt", definition: "Un état de jeu perturbé par la frustration ou l'excitation, qui pousse à prendre des décisions moins rationnelles." },
  { term: "value bet", definition: "Une mise dont l'objectif est de se faire payer par une main moins forte, à l'inverse d'un bluff qui vise à faire coucher une main plus forte." },
  { term: "flop", definition: "Les trois premières cartes communes, posées simultanément au centre de la table." },
  { term: "turn", definition: "La quatrième carte commune, posée après le flop." },
  { term: "river", definition: "La cinquième et dernière carte commune, posée après le turn." },
  { term: "préflop", definition: "Le tout premier tour d'enchères, avant que la moindre carte commune ne soit dévoilée." },
  { term: "showdown", definition: "L'abattage : les joueurs encore en lice après la river dévoilent leur jeu, et la meilleure combinaison remporte le pot." },
  { term: "bet sizing", definition: "Le calibrage de la taille d'une mise selon l'objectif recherché (value bet, bluff, mise d'exploration)." },
  { term: "bankroll", definition: "La somme qu'un joueur réserve au poker, indépendamment de son budget courant." },
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Découpe un paragraphe en segments texte/terme pour un rendu avec
 *  définitions au survol, voir components/GlossaryText.tsx. Chaque terme
 *  n'est lié qu'à sa première occurrence dans le paragraphe, pour ne pas
 *  surcharger le texte de soulignements. */
export function splitWithGlossary(
  text: string
): { text: string; definition?: string }[] {
  const pattern = new RegExp(
    `\\b(${GLOSSARY.map((g) => escapeRegExp(g.term)).join("|")})\\b`,
    "giu"
  );

  const segments: { text: string; definition?: string }[] = [];
  const linked = new Set<string>();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const matchedLower = match[0].toLowerCase();
    const entry = GLOSSARY.find((g) => g.term.toLowerCase() === matchedLower);
    if (!entry || linked.has(entry.term)) continue;

    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[0], definition: entry.definition });
    linked.add(entry.term);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments;
}
