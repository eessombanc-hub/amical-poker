/**
 * Contenu éditorial de la rubrique "Stratégie & pédagogie poker".
 *
 * Articles de fond, écrits une fois et servis statiquement, pensés pour le
 * référencement naturel (requêtes du type "règles texas hold'em", "lexique
 * poker", "stratégie poker débutant"…) autant que pour aider les nouveaux
 * membres du club. Le contenu est volontairement générique et pédagogique
 * (aucune donnée propriétaire), réutilisable et actualisable au fil du temps.
 */

export type StrategieLevel = "Débutant" | "Intermédiaire" | "Avancé";

export type StrategieArticle = {
  slug: string;
  title: string;
  excerpt: string;
  updatedAt: string; // ISO date
  readingTime: string;
  level: StrategieLevel;
  takeaway: string; // résumé "à retenir" affiché en encart sur l'article
  content: string[]; // paragraphes / puces en texte simple, un élément = un bloc
};

export const strategieArticles: StrategieArticle[] = [
  {
    slug: "regles-texas-holdem-debutant",
    title: "Les règles du Texas Hold'em expliquées simplement",
    excerpt:
      "Le déroulé complet d'une main de Texas Hold'em, du donneur au showdown, pour comprendre le jeu pratiqué à chaque manche du club.",
    updatedAt: "2026-09-01",
    readingTime: "6 min",
    level: "Débutant",
    takeaway:
      "Une main se joue en quatre temps (pré-flop, flop, turn, river) et se termine soit par un abandon général, soit par un abattage où la meilleure combinaison de cinq cartes gagne le pot.",
    content: [
      "Le Texas Hold'em est la variante de poker jouée dans la quasi-totalité des tournois amateurs et professionnels, y compris lors de nos manches mensuelles. Chaque joueur reçoit deux cartes fermées (les « hole cards »), et cinq cartes communes sont posées au centre de la table au fil de la main pour former, avec ses deux cartes, la meilleure combinaison possible de cinq cartes.",
      "Une main se déroule en quatre temps. Le pré-flop : chaque joueur reçoit ses deux cartes fermées, puis un premier tour d'enchères a lieu, lancé par les deux « blinds » (mises obligatoires postées par les deux joueurs à gauche du donneur). Le flop : trois cartes communes sont dévoilées simultanément, suivies d'un nouveau tour d'enchères. Le turn : une quatrième carte commune est révélée, puis un tour d'enchères. La river : la cinquième et dernière carte commune tombe, suivie du dernier tour d'enchères.",
      "À chaque tour, un joueur peut suivre (payer la mise en cours), relancer (augmenter la mise), ou se coucher (abandonner la main). Si plusieurs joueurs sont encore en lice après la river, on procède à l'abattage (showdown) : chacun dévoile son jeu, et le meilleur combo de cinq cartes remporte le pot.",
      "L'ordre des combinaisons, de la plus faible à la plus forte : carte haute, paire, double paire, brelan, suite, couleur, full, carré, quinte flush, quinte flush royale. C'est cet ordre qui détermine le gagnant à l'abattage, et qui guide toutes les décisions prises pendant la main.",
      "Ce format simple à apprendre mais riche en subtilités est justement ce qui rend le poker passionnant à long terme : à compétences égales, une bonne compréhension des règles et de la position à table fait déjà une vraie différence dès les premières manches.",
    ],
  },
  {
    slug: "lexique-poker-essentiel",
    title: "Lexique du poker : le vocabulaire à connaître",
    excerpt:
      "Blind, flop, all-in, tilt… un glossaire clair des termes que vous entendrez à chaque manche pour suivre le jeu sans hésiter.",
    updatedAt: "2026-09-01",
    readingTime: "5 min",
    level: "Débutant",
    takeaway:
      "Une dizaine de mots reviennent à chaque manche : les connaître par cœur suffit à suivre n'importe quelle table sans avoir à demander une explication.",
    content: [
      "Blinds (petite et grosse blind) : mises obligatoires postées avant la distribution des cartes par les deux joueurs situés à gauche du donneur, pour garantir qu'il y a toujours un pot à jouer.",
      "Flop, turn, river : respectivement les trois premières cartes communes, la quatrième, puis la cinquième et dernière carte commune posée au centre de la table.",
      "All-in (tapis) : miser l'intégralité de son tapis de jetons en une seule fois. Un joueur all-in ne peut plus être relancé au-delà de son propre tapis.",
      "Cave (buy-in) : la somme ou le nombre de jetons de départ engagés pour participer à un tournoi ou une table de cash game.",
      "Cote (pot odds) : le rapport entre la mise à payer et la taille du pot, utilisé pour décider si un suivi est rentable statistiquement sur la durée.",
      "Outs : les cartes restantes dans le paquet qui amélioreraient une main pour la rendre gagnante. Leur nombre sert à calculer ses chances de réussite avant la carte suivante.",
      "Tilt : un état de jeu perturbé par la frustration ou l'excitation, qui pousse à prendre des décisions moins rationnelles. Reconnaître son propre tilt est une compétence à part entière.",
      "Position : la place occupée à la table par rapport au donneur. Jouer « en position » (parler après ses adversaires) est un avantage informationnel important.",
      "Value bet : une mise dont l'objectif est de se faire payer par une main moins forte, à l'inverse d'un bluff qui vise à faire coucher une main plus forte.",
    ],
  },
  {
    slug: "strategie-preflop-debutant",
    title: "Stratégie préflop : bien choisir ses mains de départ",
    excerpt:
      "Les principes de base pour décider quelles mains jouer avant le flop selon sa position à table, sans avoir besoin de mémoriser un tableau complexe.",
    updatedAt: "2026-09-01",
    readingTime: "7 min",
    level: "Intermédiaire",
    takeaway:
      "Resserrez vos mains de départ en position précoce, élargissez-les en position tardive, et évitez les mains « pièges » : c'est ce seul réflexe qui élimine le plus d'erreurs coûteuses.",
    content: [
      "Avant même de voir le flop, la décision la plus importante d'une main se joue sur le choix de la jouer ou non, et comment. Un joueur qui entre dans trop de mains, ou qui les joue toutes de la même façon, perd en moyenne des jetons sur la durée, même avec de bonnes lectures ailleurs.",
      "La position est le facteur numéro un. En position tardive (bouton, cut-off), on peut élargir raisonnablement l'éventail de mains jouées car on agira après la majorité des adversaires sur les tours suivants, un avantage informationnel réel. En position précoce, mieux vaut se limiter aux mains les plus solides : grosses paires, grandes cartes assorties ou connectées.",
      "Quelques repères simples pour débuter : les grosses paires (As, Rois, Dames, Valets) se jouent presque toujours de façon agressive. Les mains assorties et connectées (par exemple dix-valet de même couleur) gagnent en valeur en position tardive ou à plusieurs joueurs, car elles peuvent réaliser de grosses mains cachées (couleurs, suites).",
      "Éviter les mains dites « pièges », comme une petite paire face à beaucoup d'adversaires, ou deux cartes moyennes non assorties, permet déjà d'éliminer une grande partie des erreurs les plus coûteuses d'un joueur débutant.",
      "Enfin, la taille de la relance préflop compte aussi : une ouverture trop petite invite trop de monde dans le coup et complique la lecture des tours suivants, tandis qu'une relance cohérente (classiquement 2,5 à 3 fois la grosse blind à table pleine) resserre le champ et prend l'initiative de la main.",
    ],
  },
  {
    slug: "comprendre-cotes-et-outs",
    title: "Cotes et outs : calculer ses chances en pleine main",
    excerpt:
      "La méthode simple pour estimer, à chaque tour d'enchères, si un suivi est justifié par les probabilités, sans calcul compliqué à la table.",
    updatedAt: "2026-09-01",
    readingTime: "6 min",
    level: "Intermédiaire",
    takeaway:
      "La règle des 4 et des 2 (outs × 4 après le flop, outs × 2 après le turn) donne en une seconde une estimation fiable de vos chances. Comparez-la ensuite au prix demandé par le pot.",
    content: [
      "Un « out » est une carte encore disponible dans le paquet qui transformerait une main en cours en la meilleure main probable. Par exemple, avec un tirage couleur après le flop (quatre cartes de la même couleur en main plus au flop), il reste neuf cartes de cette couleur dans le paquet : neuf outs.",
      "La règle des 4 et des 2 permet d'estimer rapidement une probabilité de réussite sans calcul complexe : après le flop (deux cartes à venir), on multiplie le nombre d'outs par 4 pour obtenir un pourcentage approximatif de réussite d'ici la river. Après le turn (une seule carte à venir), on multiplie par 2. Avec neuf outs après le flop, cela donne environ 36 % de chances de compléter la couleur d'ici la river.",
      "La cote du pot compare ensuite ce pourcentage à ce qu'il en coûte pour suivre. Si le pot contient 100 jetons et qu'il faut en miser 20 pour suivre, on ne risque que 20 pour tenter de remporter 120 (100 + 20) : la mise à payer représente donc environ 17 % du pot total après ajout de la mise. Si les chances de compléter sa main dépassent ce pourcentage, le suivi est rentable sur la durée ; sinon, il est déficitaire en moyenne, même s'il peut « marcher » ponctuellement.",
      "Cette logique de cotes ne remplace pas la lecture du jeu adverse, mais elle donne un cadre objectif pour éviter les décisions purement instinctives dans les moments serrés, un repère précieux pour progresser au-delà des premières manches.",
    ],
  },
  {
    slug: "gestion-bankroll-et-tapis",
    title: "Gérer sa bankroll : jouer sereinement sur la durée",
    excerpt:
      "Combien engager par manche, comment encaisser une élimination sans se braquer : les principes simples pour que le poker reste un plaisir sur toute une saison.",
    updatedAt: "2026-09-07",
    readingTime: "5 min",
    level: "Débutant",
    takeaway:
      "Fixez à l'avance le budget que vous êtes prêt à consacrer au poker sur une saison, et considérez chaque cave comme une dépense de loisir déjà « dépensée », jamais une somme à récupérer coûte que coûte.",
    content: [
      "La « bankroll » est simplement la somme qu'un joueur réserve au poker, indépendamment de son budget courant. Dans un cadre associatif comme le nôtre, l'enjeu n'est pas de calculer un nombre de caves optimal comme le ferait un professionnel, mais d'adopter une règle simple et personnelle : définir en début de saison un montant total qu'on est à l'aise de consacrer aux manches, et s'y tenir sans y revenir après une soirée difficile.",
      "Le réflexe le plus utile est de considérer chaque cave comme une dépense de loisir au moment où elle est engagée, comme un billet de cinéma, plutôt que comme un capital à faire fructifier ou à récupérer. Cette bascule mentale change beaucoup de décisions à la table : elle évite de sur-jouer une main pour « se refaire » après une élimination frustrante lors d'une précédente manche.",
      "Le tilt (jouer sous l'effet de la frustration) est la principale cause de pertes évitables chez un joueur amateur. Se fixer une règle simple, par exemple s'arrêter ou changer de table mentalement après deux mauvais coups d'affilée, ou prendre un moment avant de rebuy en cash game, protège autant le plaisir de jouer que le portefeuille.",
      "Enfin, la gestion du tapis pendant une manche mérite la même discipline : ajuster ses mises à la taille réelle de son tapis (et à celle des adversaires directement impliqués dans le coup) plutôt qu'à la taille du pot seule évite bien des décisions all-in prises par réflexe plutôt que par calcul.",
      "Le poker associatif reste avant tout un moment convivial : une bankroll bien gérée est surtout ce qui permet de revenir manche après manche avec le même plaisir, saison après saison.",
    ],
  },
  {
    slug: "formats-mtt-vs-deepstack",
    title: "MTT ou Deepstack : comprendre les formats joués au club",
    excerpt:
      "Le club alterne entre tournoi classique (MTT) et format Deepstack selon les manches : ce que ça change réellement à la table.",
    updatedAt: "2026-09-07",
    readingTime: "5 min",
    level: "Débutant",
    takeaway:
      "Un Deepstack donne plus de jetons de départ par rapport aux blindes qu'un MTT classique : la marge de manœuvre est plus grande en début de manche, ce qui favorise un jeu plus patient et moins de décisions « à quitte ou double ».",
    content: [
      "Selon les manches, l'Amical Poker Club propose deux grands formats de tournoi : le MTT (« multi-table tournament ») classique et le format Deepstack. Le nombre de manches, l'horaire et le format de chaque rendez-vous sont annoncés sur le calendrier, mais comprendre la différence entre les deux aide à mieux préparer sa soirée.",
      "Dans un tournoi classique (MTT), les joueurs démarrent avec un tapis de jetons relativement modeste par rapport à la progression des blindes au fil du temps. Les blindes augmentent à un rythme soutenu, ce qui pousse à prendre des décisions plus rapidement et favorise un jeu plus agressif, notamment en fin de tournoi lorsque les tapis deviennent courts par rapport aux blindes.",
      "Le format Deepstack, comme son nom l'indique, démarre avec un tapis de départ plus profond par rapport aux blindes initiales, et/ou une progression des blindes plus lente. Concrètement, cela laisse davantage de place à un jeu post-flop réfléchi : les joueurs peuvent se permettre de voir plus de flops, de construire des mains sur plusieurs tours d'enchères, et les éliminations prématurées liées à un tapis qui « fond » trop vite sont moins fréquentes.",
      "Pour un joueur qui découvre le club, un Deepstack est souvent plus indulgent pour apprendre : les erreurs pèsent moins lourd rapporté au tapis de départ, et il y a plus de temps pour observer les autres joueurs avant de devoir prendre des décisions engageantes. Un MTT classique, à l'inverse, entraîne à gérer la pression d'un tapis qui se resserre, une compétence utile pour progresser vers les phases finales de tournoi.",
      "Dans tous les cas, le règlement propre à chaque manche (structure de blindes, durée des niveaux, règles spécifiques) est communiqué par le responsable de la manche avant le début du tournoi. N'hésitez pas à demander si un point n'est pas clair avant que les cartes ne soient distribuées.",
    ],
  },
  {
    slug: "lecture-adversaires-et-bet-sizing",
    title: "Lire ses adversaires et calibrer ses mises",
    excerpt:
      "Au-delà des cartes : comment les habitudes de mise et le rythme de jeu des autres joueurs racontent déjà une grande partie de leur main.",
    updatedAt: "2026-09-07",
    readingTime: "7 min",
    level: "Avancé",
    takeaway:
      "La taille et le timing des mises adverses, répétés au fil d'une soirée, sont une information au moins aussi fiable que les cartes elles-mêmes, et une mise cohérente avec un plan de main déjoue ceux qui vous lisent en retour.",
    content: [
      "Passé un certain niveau, le poker se joue autant contre les habitudes des adversaires que contre les probabilités pures. Un joueur qui relance systématiquement de la même façon avec ses mains fortes, ou qui met plus de temps à agir avant un bluff, laisse des indices exploitables sur plusieurs manches, à condition d'y prêter attention même quand on n'est pas dans le coup.",
      "Les « tells » les plus fiables ne sont pas les gestes physiques (souvent surestimés et faciles à simuler), mais les habitudes de mise : la taille des relances selon la force de main, la vitesse de décision, la cohérence entre le comportement préflop et postflop. Observer un joueur sur plusieurs mains, y compris celles où l'on n'est pas engagé, construit une image beaucoup plus fiable qu'une lecture instantanée.",
      "Le bet sizing (calibrage des mises) fonctionne dans les deux sens : la taille d'une mise doit servir un objectif précis, faire payer une main plus faible (value bet), faire coucher une main plus forte (bluff), ou obtenir de l'information à moindre coût (mise d'exploration), plutôt que suivre un réflexe ou toujours la même fraction du pot par habitude.",
      "Une mise trop petite invite les mains faibles à rester dans le coup sans les punir ; une mise trop grosse peut faire fuir précisément les mains qu'on cherche à faire payer. Réfléchir, avant de miser, à « quelle main adverse continue face à cette taille » aide à choisir un montant réellement efficace plutôt qu'un montant qui semble juste intuitivement.",
      "Enfin, se faire lire fait aussi partie du jeu : varier occasionnellement son schéma de mise sur des mains de forces comparables évite de devenir trop prévisible face aux joueurs les plus observateurs de la table, un équilibre à travailler manche après manche plutôt qu'en une seule soirée.",
    ],
  },
];

export function getStrategieArticle(slug: string) {
  return strategieArticles.find((a) => a.slug === slug);
}

/** Articles à suggérer en fin de lecture : même niveau en priorité, sinon les plus récents. */
export function getRelatedArticles(slug: string, max = 3): StrategieArticle[] {
  const current = getStrategieArticle(slug);
  const others = strategieArticles.filter((a) => a.slug !== slug);
  if (!current) return others.slice(0, max);

  const sameLevel = others.filter((a) => a.level === current.level);
  const rest = others.filter((a) => a.level !== current.level);
  return [...sameLevel, ...rest].slice(0, max);
}

export const levelStyles: Record<StrategieLevel, string> = {
  "Débutant": "bg-forest/10 text-forest border-forest/30",
  "Intermédiaire": "bg-brass/15 text-[#8a6412] border-brass/40",
  "Avancé": "bg-burgundy/10 text-burgundy border-burgundy/30",
};
