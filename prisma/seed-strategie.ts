/**
 * Migration ponctuelle du contenu de la rubrique Stratégie : reprend les 7
 * articles jusqu'ici codés en dur dans lib/strategieContent.ts et les insère
 * (upsert par slug, donc rejouable sans risque) dans le modèle
 * StrategieArticle, plus 2 nouveaux articles niveau avancé et un quiz de fin
 * de lecture pour chacun des 9.
 *
 * À lancer une fois, après `npx prisma db push` :
 *   npx tsx prisma/seed-strategie.ts
 *
 * Une fois en base, ces articles s'éditent normalement depuis /admin/strategie
 * — ce script n'a pas besoin d'être relancé ensuite.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  takeaway: string;
  content: string[];
  level: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  readingTime: string;
  featured?: boolean;
  quiz: { question: string; options: string[]; correctIndex: number }[];
};

const ARTICLES: Article[] = [
  {
    slug: "regles-texas-holdem-debutant",
    title: "Les règles du Texas Hold'em expliquées simplement",
    excerpt:
      "Le déroulé complet d'une main de Texas Hold'em, du donneur au showdown, pour comprendre le jeu pratiqué à chaque manche du club.",
    readingTime: "6 min",
    level: "DEBUTANT",
    featured: true,
    takeaway:
      "Une main se joue en quatre temps (pré-flop, flop, turn, river) et se termine soit par un abandon général, soit par un abattage où la meilleure combinaison de cinq cartes gagne le pot.",
    content: [
      "Le Texas Hold'em est la variante de poker jouée dans la quasi-totalité des tournois amateurs et professionnels, y compris lors de nos manches mensuelles. Chaque joueur reçoit deux cartes fermées (les « hole cards »), et cinq cartes communes sont posées au centre de la table au fil de la main pour former, avec ses deux cartes, la meilleure combinaison possible de cinq cartes.",
      "Une main se déroule en quatre temps. Le pré-flop : chaque joueur reçoit ses deux cartes fermées, puis un premier tour d'enchères a lieu, lancé par les deux « blinds » (mises obligatoires postées par les deux joueurs à gauche du donneur). Le flop : trois cartes communes sont dévoilées simultanément, suivies d'un nouveau tour d'enchères. Le turn : une quatrième carte commune est révélée, puis un tour d'enchères. La river : la cinquième et dernière carte commune tombe, suivie du dernier tour d'enchères.",
      "À chaque tour, un joueur peut suivre (payer la mise en cours), relancer (augmenter la mise), ou se coucher (abandonner la main). Si plusieurs joueurs sont encore en lice après la river, on procède à l'abattage (showdown) : chacun dévoile son jeu, et le meilleur combo de cinq cartes remporte le pot.",
      "L'ordre des combinaisons, de la plus faible à la plus forte : carte haute, paire, double paire, brelan, suite, couleur, full, carré, quinte flush, quinte flush royale. C'est cet ordre qui détermine le gagnant à l'abattage — et qui guide toutes les décisions prises pendant la main.",
      "Ce format simple à apprendre mais riche en subtilités est justement ce qui rend le poker passionnant à long terme : à compétences égales, une bonne compréhension des règles et de la position à table fait déjà une vraie différence dès les premières manches.",
    ],
    quiz: [
      {
        question: "Combien de cartes fermées reçoit chaque joueur au début d'une main ?",
        options: ["1", "2", "3", "5"],
        correctIndex: 1,
      },
      {
        question: "Dans quel ordre se déroulent les étapes d'une main ?",
        options: [
          "Turn, flop, river, préflop",
          "Préflop, flop, turn, river",
          "Flop, préflop, river, turn",
          "River, turn, flop, préflop",
        ],
        correctIndex: 1,
      },
      {
        question: "Quelle combinaison bat une couleur ?",
        options: ["Une suite", "Un full", "Un brelan", "Une double paire"],
        correctIndex: 1,
      },
      {
        question: "Que se passe-t-il si plusieurs joueurs restent en lice après la river ?",
        options: [
          "La main s'arrête sans gagnant",
          "On rejoue une nouvelle main",
          "On procède à l'abattage (showdown)",
          "Le donneur tranche",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    slug: "lexique-poker-essentiel",
    title: "Lexique du poker : le vocabulaire à connaître",
    excerpt:
      "Blind, flop, all-in, tilt… un glossaire clair des termes que vous entendrez à chaque manche pour suivre le jeu sans hésiter.",
    readingTime: "5 min",
    level: "DEBUTANT",
    takeaway:
      "Une dizaine de mots reviennent à chaque manche : les connaître par cœur suffit à suivre n'importe quelle table sans avoir à demander une explication.",
    content: [
      "Blinds (petite et grosse blind) : mises obligatoires postées avant la distribution des cartes par les deux joueurs situés à gauche du donneur, pour garantir qu'il y a toujours un pot à jouer.",
      "Flop, turn, river : respectivement les trois premières cartes communes, la quatrième, puis la cinquième et dernière carte commune posée au centre de la table.",
      "All-in (tapis) : miser l'intégralité de son tapis de jetons en une seule fois. Un joueur all-in ne peut plus être relancé au-delà de son propre tapis.",
      "Cave (buy-in) : la somme ou le nombre de jetons de départ engagés pour participer à un tournoi ou une table de cash game.",
      "Cote (pot odds) : le rapport entre la mise à payer et la taille du pot, utilisé pour décider si un suivi est rentable statistiquement sur la durée.",
      "Outs : les cartes restantes dans le paquet qui amélioreraient une main pour la rendre gagnante — leur nombre sert à calculer ses chances de réussite avant la carte suivante.",
      "Tilt : un état de jeu perturbé par la frustration ou l'excitation, qui pousse à prendre des décisions moins rationnelles. Reconnaître son propre tilt est une compétence à part entière.",
      "Position : la place occupée à la table par rapport au donneur. Jouer « en position » (parler après ses adversaires) est un avantage informationnel important.",
      "Value bet : une mise dont l'objectif est de se faire payer par une main moins forte, à l'inverse d'un bluff qui vise à faire coucher une main plus forte.",
    ],
    quiz: [
      {
        question: "Que signifie être « all-in » ?",
        options: ["Se coucher", "Miser tout son tapis", "Relancer au minimum", "Quitter la table"],
        correctIndex: 1,
      },
      {
        question: "Les « blinds » sont...",
        options: [
          "Des mises obligatoires postées avant les cartes",
          "Les cartes communes",
          "Un type de bluff",
          "La dernière carte distribuée",
        ],
        correctIndex: 0,
      },
      {
        question: "Qu'appelle-t-on des « outs » ?",
        options: [
          "Les joueurs déjà éliminés",
          "Les cartes qui amélioreraient sa main",
          "Les jetons perdus",
          "Les mises adverses",
        ],
        correctIndex: 1,
      },
      {
        question: "Le « tilt » désigne...",
        options: [
          "Une technique de bluff avancée",
          "Un état de jeu perturbé par la frustration",
          "La position à la table",
          "Une combinaison de cartes",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "strategie-preflop-debutant",
    title: "Stratégie préflop : bien choisir ses mains de départ",
    excerpt:
      "Les principes de base pour décider quelles mains jouer avant le flop selon sa position à table, sans avoir besoin de mémoriser un tableau complexe.",
    readingTime: "7 min",
    level: "INTERMEDIAIRE",
    takeaway:
      "Resserrez vos mains de départ en position précoce, élargissez-les en position tardive, et évitez les mains « pièges » : c'est ce seul réflexe qui élimine le plus d'erreurs coûteuses.",
    content: [
      "Avant même de voir le flop, la décision la plus importante d'une main se joue sur le choix de la jouer ou non — et comment. Un joueur qui entre dans trop de mains, ou qui les joue toutes de la même façon, perd en moyenne des jetons sur la durée, même avec de bonnes lectures ailleurs.",
      "La position est le facteur numéro un. En position tardive (bouton, cut-off), on peut élargir raisonnablement l'éventail de mains jouées car on agira après la majorité des adversaires sur les tours suivants — un avantage informationnel réel. En position précoce, mieux vaut se limiter aux mains les plus solides : grosses paires, grandes cartes assorties ou connectées.",
      "Quelques repères simples pour débuter : les grosses paires (As, Rois, Dames, Valets) se jouent presque toujours de façon agressive. Les mains assorties et connectées (par exemple dix-valet de même couleur) gagnent en valeur en position tardive ou à plusieurs joueurs, car elles peuvent réaliser de grosses mains cachées (couleurs, suites).",
      "Éviter les mains dites « pièges » — comme une petite paire face à beaucoup d'adversaires, ou deux cartes moyennes non assorties — permet déjà d'éliminer une grande partie des erreurs les plus coûteuses d'un joueur débutant.",
      "Enfin, la taille de la relance préflop compte aussi : une ouverture trop petite invite trop de monde dans le coup et complique la lecture des tours suivants, tandis qu'une relance cohérente (classiquement 2,5 à 3 fois la grosse blind à table pleine) resserre le champ et prend l'initiative de la main.",
    ],
    quiz: [
      {
        question: "En position tardive, on peut généralement...",
        options: [
          "Resserrer ses mains de départ",
          "Élargir raisonnablement l'éventail de mains jouées",
          "Ne jamais relancer",
          "Jouer uniquement les paires d'As",
        ],
        correctIndex: 1,
      },
      {
        question: "Une relance préflop trop petite...",
        options: [
          "Prend l'initiative de la main",
          "Invite trop de monde dans le coup",
          "Élimine les mains pièges",
          "N'a aucun effet sur le nombre de joueurs",
        ],
        correctIndex: 1,
      },
      {
        question: "Quel type de main est considéré comme « piège » ?",
        options: [
          "As-Roi assortis",
          "Une grosse paire",
          "Une petite paire face à beaucoup d'adversaires",
          "Dix-Valet assortis en position tardive",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    slug: "comprendre-cotes-et-outs",
    title: "Cotes et outs : calculer ses chances en pleine main",
    excerpt:
      "La méthode simple pour estimer, à chaque tour d'enchères, si un suivi est justifié par les probabilités — sans calcul compliqué à la table.",
    readingTime: "6 min",
    level: "INTERMEDIAIRE",
    takeaway:
      "La règle des 4 et des 2 (outs × 4 après le flop, outs × 2 après le turn) donne en une seconde une estimation fiable de vos chances — comparez-la ensuite au prix demandé par le pot.",
    content: [
      "Un « out » est une carte encore disponible dans le paquet qui transformerait une main en cours en la meilleure main probable. Par exemple, avec un tirage couleur après le flop (quatre cartes de la même couleur en main plus au flop), il reste neuf cartes de cette couleur dans le paquet : neuf outs.",
      "La règle des 4 et des 2 permet d'estimer rapidement une probabilité de réussite sans calcul complexe : après le flop (deux cartes à venir), on multiplie le nombre d'outs par 4 pour obtenir un pourcentage approximatif de réussite d'ici la river. Après le turn (une seule carte à venir), on multiplie par 2. Avec neuf outs après le flop, cela donne environ 36 % de chances de compléter la couleur d'ici la river.",
      "La cote du pot compare ensuite ce pourcentage à ce qu'il en coûte pour suivre. Si le pot contient 100 jetons et qu'il faut en miser 20 pour suivre, on ne risque que 20 pour tenter de remporter 120 (100 + 20) : la mise à payer représente donc environ 17 % du pot total après ajout de la mise. Si les chances de compléter sa main dépassent ce pourcentage, le suivi est rentable sur la durée ; sinon, il est déficitaire en moyenne, même s'il peut « marcher » ponctuellement.",
      "Cette logique de cotes ne remplace pas la lecture du jeu adverse, mais elle donne un cadre objectif pour éviter les décisions purement instinctives dans les moments serrés — un repère précieux pour progresser au-delà des premières manches.",
    ],
    quiz: [
      {
        question: "Avec un tirage couleur après le flop, combien d'outs reste-t-il généralement ?",
        options: ["4", "9", "13", "20"],
        correctIndex: 1,
      },
      {
        question: "La règle des 4 et des 2 sert à...",
        options: [
          "Compter ses jetons restants",
          "Estimer rapidement une probabilité de réussite",
          "Calculer la taille de la relance",
          "Déterminer l'ordre des mises",
        ],
        correctIndex: 1,
      },
      {
        question: "Après le flop (deux cartes à venir), on multiplie le nombre d'outs par...",
        options: ["1", "2", "4", "6"],
        correctIndex: 2,
      },
      {
        question: "La cote du pot compare...",
        options: [
          "Le nombre d'adversaires au nombre de mains",
          "Le pourcentage de réussite au coût du suivi rapporté au pot",
          "Le tapis de départ à la mise initiale",
          "Deux mains adverses entre elles",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "gestion-bankroll-et-tapis",
    title: "Gérer sa bankroll : jouer sereinement sur la durée",
    excerpt:
      "Combien engager par manche, comment encaisser une élimination sans se braquer : les principes simples pour que le poker reste un plaisir sur toute une saison.",
    readingTime: "5 min",
    level: "DEBUTANT",
    takeaway:
      "Fixez à l'avance le budget que vous êtes prêt à consacrer au poker sur une saison, et considérez chaque cave comme une dépense de loisir déjà « dépensée » — jamais une somme à récupérer coûte que coûte.",
    content: [
      "La « bankroll » est simplement la somme qu'un joueur réserve au poker, indépendamment de son budget courant. Dans un cadre associatif comme le nôtre, l'enjeu n'est pas de calculer un nombre de caves optimal comme le ferait un professionnel, mais d'adopter une règle simple et personnelle : définir en début de saison un montant total qu'on est à l'aise de consacrer aux manches, et s'y tenir sans y revenir après une soirée difficile.",
      "Le réflexe le plus utile est de considérer chaque cave comme une dépense de loisir au moment où elle est engagée — comme un billet de cinéma — plutôt que comme un capital à faire fructifier ou à récupérer. Cette bascule mentale change beaucoup de décisions à la table : elle évite de sur-jouer une main pour « se refaire » après une élimination frustrante lors d'une précédente manche.",
      "Le tilt (jouer sous l'effet de la frustration) est la principale cause de pertes évitables chez un joueur amateur. Se fixer une règle simple — par exemple, s'arrêter ou changer de table mentalement après deux mauvais coups d'affilée, prendre un moment avant de rebuy en cash game — protège autant le plaisir de jouer que le portefeuille.",
      "Enfin, la gestion du tapis pendant une manche mérite la même discipline : ajuster ses mises à la taille réelle de son tapis (et à celle des adversaires directement impliqués dans le coup) plutôt qu'à la taille du pot seule évite bien des décisions all-in prises par réflexe plutôt que par calcul.",
      "Le poker associatif reste avant tout un moment convivial : une bankroll bien gérée est surtout ce qui permet de revenir manche après manche avec le même plaisir, saison après saison.",
    ],
    quiz: [
      {
        question: "Que signifie « bankroll » ?",
        options: [
          "Le nombre de mains jouées",
          "La somme réservée au poker, indépendante du budget courant",
          "Le montant misé sur une seule main",
          "Le nombre de jetons de départ d'un tournoi",
        ],
        correctIndex: 1,
      },
      {
        question: "Quel réflexe aide à éviter le tilt après une élimination frustrante ?",
        options: [
          "Rebuy immédiatement pour se refaire",
          "Considérer chaque cave comme une dépense de loisir déjà engagée",
          "Augmenter systématiquement ses mises",
          "Changer de club",
        ],
        correctIndex: 1,
      },
      {
        question: "La gestion du tapis pendant une manche doit s'ajuster...",
        options: [
          "Uniquement à la taille du pot",
          "À la taille réelle de son tapis et de celui des adversaires impliqués",
          "Toujours au montant de la grosse blind",
          "Au nombre de joueurs restants dans le tournoi",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "formats-mtt-vs-deepstack",
    title: "MTT ou Deepstack : comprendre les formats joués au club",
    excerpt:
      "Le club alterne entre tournoi classique (MTT) et format Deepstack selon les manches : ce que ça change réellement à la table.",
    readingTime: "5 min",
    level: "DEBUTANT",
    takeaway:
      "Un Deepstack donne plus de jetons de départ par rapport aux blindes qu'un MTT classique : la marge de manœuvre est plus grande en début de manche, ce qui favorise un jeu plus patient et moins de décisions « à quitte ou double ».",
    content: [
      "Selon les manches, l'Amical Poker Club propose deux grands formats de tournoi : le MTT (« multi-table tournament ») classique et le format Deepstack. Le nombre de manches, l'horaire et le format de chaque rendez-vous sont annoncés sur le calendrier, mais comprendre la différence entre les deux aide à mieux préparer sa soirée.",
      "Dans un tournoi classique (MTT), les joueurs démarrent avec un tapis de jetons relativement modeste par rapport à la progression des blindes au fil du temps. Les blindes augmentent à un rythme soutenu, ce qui pousse à prendre des décisions plus rapidement et favorise un jeu plus agressif, notamment en fin de tournoi lorsque les tapis deviennent courts par rapport aux blindes.",
      "Le format Deepstack, comme son nom l'indique, démarre avec un tapis de départ plus profond par rapport aux blindes initiales, et/ou une progression des blindes plus lente. Concrètement, cela laisse davantage de place à un jeu post-flop réfléchi : les joueurs peuvent se permettre de voir plus de flops, de construire des mains sur plusieurs tours d'enchères, et les éliminations prématurées liées à un tapis qui « fond » trop vite sont moins fréquentes.",
      "Pour un joueur qui découvre le club, un Deepstack est souvent plus indulgent pour apprendre : les erreurs pèsent moins lourd rapporté au tapis de départ, et il y a plus de temps pour observer les autres joueurs avant de devoir prendre des décisions engageantes. Un MTT classique, à l'inverse, entraîne à gérer la pression d'un tapis qui se resserre — une compétence utile pour progresser vers les phases finales de tournoi.",
      "Dans tous les cas, le règlement propre à chaque manche (structure de blindes, durée des niveaux, règles spécifiques) est communiqué par le responsable de la manche avant le début du tournoi — n'hésitez pas à demander si un point n'est pas clair avant que les cartes ne soient distribuées.",
    ],
    quiz: [
      {
        question: "Dans un format Deepstack, comparé à un MTT classique...",
        options: [
          "Les blindes montent plus vite",
          "Le tapis de départ est plus profond par rapport aux blindes",
          "Il n'y a pas de blindes",
          "Le nombre de joueurs est limité à deux",
        ],
        correctIndex: 1,
      },
      {
        question: "Un jeu post-flop plus réfléchi est favorisé par...",
        options: [
          "Un tapis de départ profond et/ou des blindes progressant lentement",
          "Des blindes qui augmentent très vite",
          "Un nombre réduit de cartes communes",
          "L'absence de tour d'enchères",
        ],
        correctIndex: 0,
      },
      {
        question: "Pour un joueur qui découvre le club, quel format est souvent plus indulgent ?",
        options: [
          "Le MTT classique",
          "Le Deepstack",
          "Les deux sont strictement identiques",
          "Aucun des deux, il faut jouer en cash game",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "lecture-adversaires-et-bet-sizing",
    title: "Lire ses adversaires et calibrer ses mises",
    excerpt:
      "Au-delà des cartes : comment les habitudes de mise et le rythme de jeu des autres joueurs racontent déjà une grande partie de leur main.",
    readingTime: "7 min",
    level: "AVANCE",
    takeaway:
      "La taille et le timing des mises adverses, répétés au fil d'une soirée, sont une information au moins aussi fiable que les cartes elles-mêmes — et une mise cohérente avec un plan de main déjoue ceux qui vous lisent en retour.",
    content: [
      "Passé un certain niveau, le poker se joue autant contre les habitudes des adversaires que contre les probabilités pures. Un joueur qui relance systématiquement de la même façon avec ses mains fortes, ou qui met plus de temps à agir avant un bluff, laisse des indices exploitables sur plusieurs manches — à condition d'y prêter attention même quand on n'est pas dans le coup.",
      "Les « tells » les plus fiables ne sont pas les gestes physiques (souvent surestimés et faciles à simuler), mais les habitudes de mise : la taille des relances selon la force de main, la vitesse de décision, la cohérence entre le comportement préflop et postflop. Observer un joueur sur plusieurs mains, y compris celles où l'on n'est pas engagé, construit une image beaucoup plus fiable qu'une lecture instantanée.",
      "Le bet sizing (calibrage des mises) fonctionne dans les deux sens : la taille d'une mise doit servir un objectif précis — faire payer une main plus faible (value bet), faire coucher une main plus forte (bluff), ou obtenir de l'information à moindre coût (mise d'exploration) — plutôt que suivre un réflexe ou toujours la même fraction du pot par habitude.",
      "Une mise trop petite invite les mains faibles à rester dans le coup sans les punir ; une mise trop grosse peut faire fuir précisément les mains qu'on cherche à faire payer. Réfléchir, avant de miser, à « quelle main adverse continue face à cette taille » aide à choisir un montant réellement efficace plutôt qu'un montant qui semble juste intuitivement.",
      "Enfin, se faire lire fait aussi partie du jeu : varier occasionnellement son schéma de mise sur des mains de forces comparables évite de devenir trop prévisible face aux joueurs les plus observateurs de la table — un équilibre à travailler manche après manche plutôt qu'en une seule soirée.",
    ],
    quiz: [
      {
        question: "Les « tells » les plus fiables sont généralement...",
        options: [
          "Les gestes physiques",
          "Les habitudes de mise (taille, timing, cohérence)",
          "La couleur des jetons utilisés",
          "Le nombre de mains jouées dans la soirée",
        ],
        correctIndex: 1,
      },
      {
        question: "Un « value bet » a pour objectif de...",
        options: [
          "Faire coucher une main plus forte",
          "Se faire payer par une main plus faible",
          "Obtenir de l'information à moindre coût",
          "Égaliser le tapis des joueurs",
        ],
        correctIndex: 1,
      },
      {
        question: "Une mise trop grosse risque de...",
        options: [
          "Faire fuir les mains qu'on cherche à faire payer",
          "Toujours être suivie",
          "Ne jamais servir de bluff",
          "Réduire la taille du pot",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "icm-fin-de-tournoi",
    title: "Comprendre l'ICM en fin de tournoi",
    excerpt:
      "Pourquoi une main qu'on jouerait sans hésiter en cash game peut devenir une erreur coûteuse près de la bulle ou à une table finale.",
    readingTime: "7 min",
    level: "AVANCE",
    takeaway:
      "Proche de la bulle ou d'un palier de gains, la valeur d'un jeton n'est plus linéaire : survivre peut valoir plus que quelques jetons gagnés sur un coup risqué, et un tapis court a souvent intérêt à jouer plus serré qu'un simple calcul de cotes ne le suggère.",
    content: [
      "L'ICM (Independent Chip Model) est un modèle qui convertit un tapis de jetons en équité réelle de tournoi, c'est-à-dire en valeur monétaire attendue compte tenu de la structure des gains restants. En cash game, un jeton vaut toujours la même chose : gagner ou perdre 100 jetons a un impact linéaire sur le portefeuille. En tournoi, ce n'est plus vrai dès qu'une structure de gains entre en jeu.",
      "L'effet se fait particulièrement sentir près de la bulle, le point où le joueur suivant à être éliminé repart sans rien tandis que tous les survivants touchent au moins le premier palier de gains. Là, le risque d'élimination devient très coûteux en équité : un « coup all-in » mathématiquement correct en cotes brutes peut devenir une erreur si le risque de sortir juste avant la bulle dépasse le gain espéré en jetons. C'est ce qu'on appelle jouer avec un « facteur bulle » élevé.",
      "Concrètement, un tapis court proche de la bulle a intérêt à resserrer encore son éventail de mains par rapport à ce que suggérerait un calcul de cotes classique, et à éviter les confrontations marginales contre de gros tapis — ceux-ci ont peu à perdre à le faire sortir et peuvent donc mettre une pression disproportionnée. À l'inverse, un gros tapis peut exploiter cette dynamique en relançant plus large contre les tapis moyens, qui ont eux beaucoup à perdre.",
      "À la table finale, le même principe s'applique à chaque palier de gains : plus on se rapproche du sommet, plus l'écart entre deux places peut être important en valeur réelle, ce qui justifie parfois un jeu défensif de la part des tapis courts — voire, si l'occasion se présente, une discussion entre les derniers joueurs pour un accord (« deal ») qui reflète mieux l'équité de chacun que le seul classement au moment de l'arrêt.",
      "L'ICM reste un outil d'aide à la décision pour les situations serrées en fin de tournoi : il ne remplace pas les fondamentaux (position, lecture d'adversaire, cotes) qui restent déterminants tant que la table est loin de la bulle ou des gains, moments où les jetons se comportent encore, eux, de façon quasiment linéaire.",
    ],
    quiz: [
      {
        question: "L'ICM (Independent Chip Model) sert à...",
        options: [
          "Compter le nombre de jetons distribués",
          "Convertir un tapis de jetons en valeur d'équité de tournoi",
          "Calculer la cote du pot",
          "Déterminer l'ordre des mises",
        ],
        correctIndex: 1,
      },
      {
        question: "Près de la bulle, un tapis court a généralement intérêt à...",
        options: [
          "Jouer plus large qu'en cash game",
          "Se resserrer davantage que ne le suggérerait un simple calcul de cotes",
          "Toujours suivre les relances",
          "Ignorer la structure des gains",
        ],
        correctIndex: 1,
      },
      {
        question: "Un gros tapis proche de la bulle peut se permettre de...",
        options: [
          "Ne jamais relancer",
          "Mettre la pression sur les tapis moyens, qui ont plus à perdre",
          "Se coucher systématiquement",
          "Jouer identiquement à un tapis court",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "jouer-en-heads-up",
    title: "Bien jouer en heads-up",
    excerpt:
      "Face à un seul adversaire, la plupart des mains deviennent jouables : ce qui change vraiment quand un tournoi se termine à deux.",
    readingTime: "6 min",
    level: "AVANCE",
    takeaway:
      "En heads-up, l'éventail de mains jouables s'élargit radicalement et la position — être au bouton, donc parler en dernier après le flop — devient l'avantage numéro un : s'adapter vite au style de l'adversaire compte plus que d'attendre une main forte.",
    content: [
      "Le heads-up, un affrontement à deux joueurs seulement, change fondamentalement la valeur des mains. Avec un seul adversaire plutôt que huit ou neuf, une carte haute ou une paire moyenne devient statistiquement bien plus forte qu'à une table pleine. La quasi-totalité des mains de départ devient jouable, à l'inverse de la sélectivité recommandée en début de tournoi.",
      "La position prend une importance encore plus grande qu'ailleurs. En heads-up, le joueur au bouton poste la petite blind avant les cartes, mais c'est justement lui qui parlera en dernier à chaque tour d'enchères après le flop — un avantage informationnel majeur qui justifie d'ouvrir très large depuis cette position, y compris avec des mains qu'on coucherait sans hésiter à une table pleine.",
      "S'adapter au style de l'adversaire compte davantage que d'appliquer une stratégie figée : face à un joueur passif qui suit beaucoup, les value bets peuvent être plus fines (thinner) car il paiera avec des mains plus faibles ; face à un joueur très agressif qui relance et bluffe souvent, il faut élargir ses ranges de suivi et de relance en retour plutôt que d'attendre une main forte pour réagir.",
      "Le heads-up récompense une pression constante — ouvertures fréquentes, continuation bets réguliers — mais cette agressivité doit rester liée à un plan de main plutôt que devenir un réflexe automatique : avec si peu d'adversaires à lire, on est aussi soi-même lu très vite si le schéma de jeu devient trop prévisible.",
      "Enfin, le heads-up est souvent la phase la plus intense d'un tournoi, avec une variance élevée sur un petit nombre de mains : perdre un coup ne signifie pas avoir mal joué. Rester concentré sur la qualité de chaque décision plutôt que sur son résultat immédiat compte encore plus ici que dans le reste de la manche.",
    ],
    quiz: [
      {
        question: "En heads-up, comparé à une table pleine, l'éventail de mains jouables...",
        options: ["Se resserre fortement", "S'élargit radicalement", "Reste identique", "Ne dépend que du tapis"],
        correctIndex: 1,
      },
      {
        question: "Au bouton en heads-up, on...",
        options: [
          "Poste la grosse blind et parle en premier postflop",
          "Poste la petite blind mais parle en dernier postflop",
          "Ne poste aucune blind",
          "Doit obligatoirement se coucher préflop",
        ],
        correctIndex: 1,
      },
      {
        question: "Face à un adversaire très passif en heads-up, il est pertinent de...",
        options: [
          "Value bet plus finement (thinner)",
          "Ne jamais miser",
          "Se coucher plus souvent",
          "Ignorer son style de jeu",
        ],
        correctIndex: 0,
      },
    ],
  },
];

async function main() {
  for (const a of ARTICLES) {
    const { slug, ...data } = a;
    await prisma.strategieArticle.upsert({
      where: { slug },
      update: { ...data, status: "PUBLIE" },
      create: { slug, ...data, status: "PUBLIE" },
    });
    console.log(`✓ ${slug}`);
  }
  console.log(`\n✅ ${ARTICLES.length} articles stratégie synchronisés en base.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
