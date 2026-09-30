/**
 * Renforce la rubrique Stratégie & pédagogie poker :
 *  1. Ajoute 5 nouveaux articles Débutant répondant aux questions les plus
 *     posées par les nouveaux joueurs (ordre des mains, déroulé d'une
 *     soirée club, coût, hasard vs stratégie, cash game vs tournoi) —
 *     demande d'Emeric du 15/09/2026.
 *  2. Ajoute un quiz de 3 questions (voir components/ArticleQuiz.tsx) sur
 *     les 7 articles existants qui n'en ont pas encore, pour vérifier ce
 *     qui a été retenu à la fin de chaque article.
 *
 * Idempotent : peut être relancé sans risque (upsert par slug pour les
 * nouveaux articles, mise à jour du seul champ quiz pour les existants).
 *
 * Usage : npx tsx prisma/renforcer-strategie-faq.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Quiz = { question: string; options: string[]; correctIndex: number }[];

const NEW_ARTICLES = [
  {
    slug: "ordre-des-mains-au-poker",
    title: "Quel est l'ordre des mains au poker ?",
    excerpt:
      "Le classement complet des combinaisons, de la carte haute à la quinte flush royale, pour savoir en un coup d'œil qui gagne à l'abattage.",
    level: "DEBUTANT" as const,
    readingTime: "4 min",
    takeaway:
      "Dix combinaisons existent, de la carte haute (la plus faible) à la quinte flush royale (la plus forte) — les mémoriser dans l'ordre suffit pour juger n'importe quel abattage sans hésiter.",
    content: [
      "C'est la question que se pose tout nouveau joueur avant sa première manche : qui gagne, entre telle ou telle main ? Voici l'ordre exact des dix combinaisons du poker, de la plus faible à la plus forte — celui qui sert de référence à chaque abattage.",
      "De la plus faible à la plus forte : carte haute (aucune combinaison, seule la carte la plus haute compte), paire (deux cartes de même valeur), double paire, brelan (trois cartes de même valeur), suite (cinq cartes qui se suivent, couleurs mélangées), couleur (cinq cartes de la même couleur, valeurs mélangées), full (un brelan plus une paire), carré (quatre cartes de même valeur), quinte flush (une suite dans la même couleur), et enfin la quinte flush royale (10-Valet-Dame-Roi-As dans la même couleur), la main suprême et la plus rare de toutes.",
      "Un point qui surprend souvent les nouveaux joueurs : la couleur des cartes elle-même (pique, cœur, carreau, trèfle) ne départage jamais deux mains de même type en Texas Hold'em. Entre deux couleurs (flush), c'est la carte la plus haute de chaque main qui tranche, jamais la couleur en tant que telle.",
      "Pas besoin d'apprendre ce classement par cœur en une soirée : avec quelques manches jouées, il devient un réflexe naturel. En attendant, garder cette page sous la main (ou simplement se souvenir que plus une combinaison est rare, plus elle est forte) suffit largement pour suivre n'importe quel abattage sans hésiter.",
      "Pour aller plus loin, l'article sur les règles du Texas Hold'em détaille le déroulé complet d'une main, et le lexique du poker couvre le vocabulaire qui accompagne ces combinaisons à la table.",
    ],
    quiz: [
      {
        question: "Quelle main est plus forte qu'une couleur (flush) ?",
        options: ["Une suite", "Un full", "Une double paire"],
        correctIndex: 1,
      },
      {
        question: "Combien de cartes composent une main évaluée à l'abattage ?",
        options: ["4", "5", "7"],
        correctIndex: 1,
      },
      {
        question: "Qu'est-ce qui départage deux couleurs (flush) de hauteurs différentes ?",
        options: [
          "La couleur elle-même (pique bat cœur, etc.)",
          "La carte la plus haute de chaque main",
          "Le nombre de cartes assorties en main fermée",
        ],
        correctIndex: 1,
      },
    ] satisfies Quiz,
  },
  {
    slug: "comment-se-deroule-une-soiree-poker-club",
    title: "Comment se déroule une soirée de poker au club ?",
    excerpt:
      "De l'accueil à la remise des points, le déroulé concret d'une manche de l'Amical Poker Club, pour aborder sa première soirée sans surprise.",
    level: "DEBUTANT" as const,
    readingTime: "4 min",
    takeaway:
      "Accueil, tirage des places, jeu jusqu'à la table finale ou l'heure de fin : une manche du club dure en général une bonne partie de soirée, dans une ambiance conviviale avant tout.",
    content: [
      "Venir à sa première manche sans savoir à quoi s'attendre peut freiner l'envie de franchir le pas. Voici le déroulé type d'une soirée, pour aborder sa première participation sereinement.",
      "L'accueil se fait généralement un peu avant le début du jeu (voir l'horaire d'ouverture indiqué sur chaque manche du calendrier, distinct de l'horaire de début effectif des cartes) : le temps de s'installer, d'échanger avec les autres joueurs, et de procéder au tirage aléatoire des places à table.",
      "Le format joué (MTT classique ou Deepstack selon la manche, voir l'article dédié) détermine la structure des blindes et le rythme de la soirée. Dans tous les cas, le responsable de la manche communique en début de soirée les règles spécifiques du jour, si certaines diffèrent de l'usage habituel du club — n'hésitez jamais à demander une précision avant que les cartes ne soient distribuées.",
      "Au fil de la soirée, les éliminations sont enregistrées au fur et à mesure par l'organisation (le « journal des busts »), ce qui permet de publier un classement de la manche dès la fin du tournoi, consultable ensuite depuis le site. Aucune expérience préalable n'est nécessaire : les membres plus expérimentés du club aident volontiers les nouveaux venus à se repérer pendant les premières mains.",
      "La soirée se termine soit par l'arrivée à une table finale et la désignation d'un vainqueur, soit à une heure convenue à l'avance selon le format. Dans les deux cas, l'essentiel reste le moment passé ensemble : le classement et les points comptent, mais la convivialité est ce qui fait revenir manche après manche.",
    ],
    quiz: [
      {
        question: "Que se passe-t-il en général juste avant le début du jeu ?",
        options: ["Le tirage aléatoire des places", "Le vote du meilleur joueur du mois", "La remise des prix de la saison"],
        correctIndex: 0,
      },
      {
        question: "Qui communique la structure précise de blindes et les règles spécifiques d'une manche ?",
        options: ["Chaque joueur individuellement", "Le responsable de la manche", "Uniquement le site internet, à l'avance"],
        correctIndex: 1,
      },
      {
        question: "Faut-il déjà être un joueur expérimenté pour venir à sa première manche ?",
        options: [
          "Oui, c'est réservé aux joueurs confirmés",
          "Non, l'ambiance reste avant tout conviviale et les autres membres aident volontiers",
          "Oui, un test d'admission est organisé avant",
        ],
        correctIndex: 1,
      },
    ] satisfies Quiz,
  },
  {
    slug: "combien-coute-une-soiree-poker-club",
    title: "Combien coûte une soirée de poker en club associatif ?",
    excerpt:
      "Cotisation et fonctionnement en points : ce qu'il faut savoir avant de pousser la porte d'un club de poker associatif comme le nôtre.",
    level: "DEBUTANT" as const,
    readingTime: "3 min",
    takeaway:
      "Dans un club associatif loi 1901 comme le nôtre, le poker se joue avec un système de points, pas d'argent réel en jeu à la table : l'essentiel du budget se limite à l'adhésion, pas à chaque manche.",
    content: [
      "Beaucoup de nouveaux venus hésitent à franchir le pas en imaginant le poker comme au casino ou en ligne, avec de l'argent réellement engagé à chaque main. Un club associatif loi 1901 comme l'Amical Poker Club fonctionne différemment.",
      "Les manches se jouent sur un système de points : chaque participant reçoit un classement selon ses performances (position, éliminations réalisées...), cumulé sur la saison pour établir le classement et le palmarès du club, visibles depuis le site. Il ne s'agit pas de gains en argent réel redistribués en fin de soirée.",
      "Le principal engagement financier est donc l'adhésion à l'association, qui donne accès aux manches de la saison. Le montant exact et les modalités sont précisés lors de la demande d'adhésion sur le site — ils peuvent évoluer d'une saison à l'autre, mieux vaut donc toujours se référer à la page à jour plutôt qu'à un chiffre entendu par ailleurs.",
      "Au-delà de l'adhésion, aucune dépense n'est obligatoire pour participer aux manches. La boutique du club (vêtements floqués aux couleurs de l'association) reste une option pour ceux qui le souhaitent, jamais une condition pour jouer.",
      "Pour connaître les modalités précises et déposer une demande, direction la page dédiée à l'adhésion — ou la demande d'accès invité pour simplement découvrir le forum et la communauté avant de se décider.",
    ],
    quiz: [
      {
        question: "Le classement du club repose sur…",
        options: ["Des gains en argent réel redistribués", "Un système de points cumulés sur la saison", "Un tirage au sort mensuel"],
        correctIndex: 1,
      },
      {
        question: "Où trouver le montant exact de la cotisation ?",
        options: [
          "Sur le formulaire de demande d'adhésion du site, toujours à jour",
          "Il n'existe aucune cotisation",
          "Uniquement en contactant la Ligue Française de Poker",
        ],
        correctIndex: 0,
      },
      {
        question: "Les achats à la boutique du club (vêtements floqués) sont…",
        options: ["Obligatoires pour pouvoir jouer", "Optionnels", "Remboursés automatiquement en fin de saison"],
        correctIndex: 1,
      },
    ] satisfies Quiz,
  },
  {
    slug: "poker-jeu-de-hasard-ou-de-strategie",
    title: "Le poker est-il un jeu de hasard ou de stratégie ?",
    excerpt:
      "Entre distribution aléatoire des cartes et décisions répétées manche après manche, ce que la variance change vraiment sur la durée.",
    level: "DEBUTANT" as const,
    readingTime: "4 min",
    takeaway:
      "Sur une seule main, la chance pèse énormément ; sur une saison entière de manches répétées, ce sont les décisions prises main après main qui font la différence entre les joueurs.",
    content: [
      "C'est sans doute la question la plus fréquente chez qui découvre le poker : est-ce un jeu de hasard, comme une loterie, ou un jeu de stratégie, comme les échecs ? La réponse honnête est : les deux, mais pas à la même échelle de temps.",
      "Sur une main isolée, la distribution des cartes est entièrement aléatoire, et un joueur débutant peut tout à fait battre un joueur expérimenté ce soir-là — c'est ce qu'on appelle la variance, et elle fait partie intégrante du jeu, y compris pour les meilleurs joueurs du monde.",
      "C'est sur la durée que la différence apparaît : sur des dizaines de mains, puis des dizaines de manches au fil d'une saison, les décisions répétées (quelles mains jouer, comment ajuster ses mises, quand suivre ou se coucher) pèsent statistiquement plus lourd que la seule distribution des cartes. C'est ce mécanisme qui explique qu'un même petit groupe de joueurs se retrouve souvent en tête du classement d'une saison à l'autre, sans que cela empêche quiconque de remporter une manche donnée.",
      "Faut-il alors être fort en mathématiques pour bien jouer ? Pas au niveau où l'on pourrait le craindre : des repères simples, comme la règle des 4 et des 2 pour estimer ses chances (voir l'article sur les cotes et les outs), suffisent largement pour progresser. L'expérience de jeu et l'observation des autres joueurs comptent souvent davantage que le calcul pur, en tout cas dans un cadre associatif comme le nôtre.",
      "La rubrique Stratégie du site existe précisément pour raccourcir cette courbe d'apprentissage : mieux vaut avancer progressivement, du niveau Débutant vers l'Intermédiaire puis l'Avancé, plutôt que de chercher à tout maîtriser dès la première manche.",
    ],
    quiz: [
      {
        question: "Sur une seule main, quel facteur domine généralement le résultat ?",
        options: ["La chance (distribution des cartes)", "L'ancienneté du joueur au club", "La météo du jour"],
        correctIndex: 0,
      },
      {
        question: "Sur une saison complète de manches, qu'est-ce qui tend à faire la différence entre joueurs ?",
        options: ["Uniquement la chance", "La qualité des décisions répétées manche après manche", "L'ordre d'arrivée à la table"],
        correctIndex: 1,
      },
      {
        question: "Faut-il être un expert en mathématiques pour bien jouer ?",
        options: ["Oui, un niveau universitaire est nécessaire", "Non, quelques repères simples suffisent largement", "Oui, mais seulement en tournoi"],
        correctIndex: 1,
      },
    ] satisfies Quiz,
  },
  {
    slug: "difference-cash-game-tournoi-poker",
    title: "Quelle est la différence entre cash game et tournoi de poker ?",
    excerpt:
      "Deux façons de jouer bien distinctes, qui changent la stratégie à adopter — et ce que joue concrètement notre club à chaque manche.",
    level: "DEBUTANT" as const,
    readingTime: "4 min",
    takeaway:
      "En tournoi, on joue jusqu'à élimination ou victoire avec des blindes qui montent ; en cash game, les jetons ont une valeur fixe et on peut s'asseoir ou quitter la table à tout moment. Le club pratique le format tournoi à ses manches.",
    content: [
      "Deux grandes familles de poker existent, avec des logiques de jeu bien différentes : le tournoi et le cash game. Comprendre la distinction aide à mieux suivre les articles de stratégie et à savoir à quoi s'attendre à chaque manche.",
      "En tournoi, tous les joueurs démarrent avec le même nombre de jetons, et les blindes (mises obligatoires) augmentent régulièrement au fil du temps. Un joueur qui perd tous ses jetons est éliminé (sauf période de rebuy autorisée selon le règlement de la manche), et le tournoi se termine lorsqu'un joueur détient l'intégralité des jetons en jeu, ou à une heure convenue pour les formats à durée fixe.",
      "En cash game, les jetons ont une valeur directement liée à l'argent engagé au moment de s'asseoir à la table, les blindes restent fixes, et chaque joueur peut recompléter son tapis (rebuy) ou quitter la table à tout moment, sans attendre la fin d'une manche collective. C'est le format le plus souvent associé au poker « de casino » en dehors des grands tournois.",
      "Ces différences changent la stratégie à adopter : en tournoi, la préservation du tapis face à des blindes qui montent crée une pression de survie qui n'existe pas en cash game, où chaque main peut davantage être jouée « pour elle-même », sans cette contrainte de temps.",
      "L'Amical Poker Club pratique un format tournoi à ses manches (MTT classique ou Deepstack selon les soirées, voir l'article dédié à ces deux formats), avec un classement de saison basé sur les points plutôt que sur des gains en argent. C'est un format particulièrement adapté à la découverte : la perte est limitée à la cave engagée, contrairement à un cash game où l'on peut, en théorie, continuer à recompléter son tapis.",
    ],
    quiz: [
      {
        question: "Dans un tournoi, que se passe-t-il quand un joueur perd tous ses jetons (hors période de rebuy) ?",
        options: ["Il est éliminé du tournoi", "Il rejoue automatiquement avec un tapis neuf", "La partie s'arrête pour tout le monde"],
        correctIndex: 0,
      },
      {
        question: "En cash game, la valeur des jetons est…",
        options: ["Variable selon l'heure de la soirée", "Fixe et directement liée à l'argent engagé", "Décidée à chaque main par un vote"],
        correctIndex: 1,
      },
      {
        question: "Quel format pratique l'Amical Poker Club lors de ses manches ?",
        options: ["Uniquement du cash game", "Un format tournoi (MTT ou Deepstack)", "Un mélange tiré au sort à chaque main"],
        correctIndex: 1,
      },
    ] satisfies Quiz,
  },
];

// Quiz ajoutés aux 7 articles existants (contenu déjà en place, on ne
// touche qu'au champ `quiz`). Basé sur le contenu de référence (voir
// lib/strategieContent.ts) — sans danger si le libellé exact a été
// légèrement modifié depuis l'admin, seul le fond est repris ici.
const EXISTING_QUIZZES: Record<string, Quiz> = {
  "regles-texas-holdem-debutant": [
    {
      question: "Combien de cartes fermées reçoit chaque joueur au Texas Hold'em ?",
      options: ["1", "2", "4"],
      correctIndex: 1,
    },
    {
      question: "Dans quel ordre les cartes communes sont-elles dévoilées ?",
      options: ["River, puis turn, puis flop", "Flop, puis turn, puis river", "Turn, puis flop, puis river"],
      correctIndex: 1,
    },
    {
      question: "Que se passe-t-il si plusieurs joueurs sont encore en lice après la river ?",
      options: ["La main est automatiquement annulée", "L'abattage (showdown)", "Un tirage au sort désigne le gagnant"],
      correctIndex: 1,
    },
  ],
  "lexique-poker-essentiel": [
    {
      question: "Que signifie être « all-in » ?",
      options: ["Se coucher", "Miser tout son tapis en une seule fois", "Changer de table"],
      correctIndex: 1,
    },
    {
      question: "Qu'est-ce qu'un « out » ?",
      options: ["Une carte encore disponible qui améliorerait la main", "Un joueur qui vient d'être éliminé", "Une règle propre à un casino"],
      correctIndex: 0,
    },
    {
      question: "Le « tilt » désigne…",
      options: ["Une variante du jeu", "Un état de jeu perturbé par la frustration ou l'excitation", "Une main particulièrement forte"],
      correctIndex: 1,
    },
  ],
  "strategie-preflop-debutant": [
    {
      question: "En position tardive, l'éventail de mains jouées devrait plutôt…",
      options: ["Se resserrer", "S'élargir raisonnablement", "Rester identique à la position précoce"],
      correctIndex: 1,
    },
    {
      question: "Quel type de main est considéré comme « piège » pour un débutant ?",
      options: ["Une grosse paire (As, Rois...)", "Une petite paire face à beaucoup d'adversaires", "Deux cartes assorties de forte valeur"],
      correctIndex: 1,
    },
    {
      question: "Une relance préflop trop petite a tendance à…",
      options: ["Faire fuir tout le monde", "Inviter trop de joueurs dans le coup", "N'avoir aucun effet sur la main"],
      correctIndex: 1,
    },
  ],
  "comprendre-cotes-et-outs": [
    {
      question: "Selon la règle des 4 et des 2, après le flop on multiplie le nombre d'outs par…",
      options: ["2", "4", "6"],
      correctIndex: 1,
    },
    {
      question: "Avec 9 outs après le flop, la probabilité approximative de compléter sa main d'ici la river est d'environ…",
      options: ["18 %", "36 %", "50 %"],
      correctIndex: 1,
    },
    {
      question: "La cote du pot compare…",
      options: ["Le nombre d'outs à la taille des blindes", "Le prix à payer pour suivre à ce que l'on peut gagner", "Le nombre de joueurs encore en lice"],
      correctIndex: 1,
    },
  ],
  "gestion-bankroll-et-tapis": [
    {
      question: "La bankroll doit idéalement être…",
      options: ["Un budget défini à l'avance, distinct du budget courant", "Empruntée en cas de besoin pendant la soirée", "Recalculée après chaque manche perdue"],
      correctIndex: 0,
    },
    {
      question: "Quelle est présentée comme la principale cause de pertes évitables chez un joueur amateur ?",
      options: ["Le tilt", "La chance", "Le format Deepstack"],
      correctIndex: 0,
    },
    {
      question: "Comment considérer une cave déjà engagée dans une manche ?",
      options: ["Comme un capital à récupérer coûte que coûte", "Comme une dépense de loisir déjà « dépensée »", "Comme un prêt à rembourser au club"],
      correctIndex: 1,
    },
  ],
  "formats-mtt-vs-deepstack": [
    {
      question: "Qu'est-ce qui caractérise un format Deepstack par rapport à un MTT classique ?",
      options: ["Un tapis de départ plus profond par rapport aux blindes", "Des blindes qui n'augmentent jamais", "Un nombre de joueurs plus restreint"],
      correctIndex: 0,
    },
    {
      question: "Un MTT classique entraîne surtout à…",
      options: ["Gérer la pression d'un tapis qui se resserre face aux blindes", "Éviter tout risque à la table", "Jouer uniquement en cash game"],
      correctIndex: 0,
    },
    {
      question: "Qui communique la structure précise de blindes d'une manche donnée ?",
      options: ["Le responsable de la manche", "Chaque joueur, individuellement", "Personne : elle est strictement identique à chaque fois"],
      correctIndex: 0,
    },
  ],
  "lecture-adversaires-et-bet-sizing": [
    {
      question: "D'après l'article, les tells les plus fiables sont surtout…",
      options: ["Les gestes physiques", "Les habitudes de mise et le timing de décision", "La tenue vestimentaire du joueur"],
      correctIndex: 1,
    },
    {
      question: "Une mise trop petite a tendance à…",
      options: ["Faire fuir toutes les mains adverses", "Inviter des mains faibles à rester dans le coup sans les punir", "N'avoir aucune conséquence"],
      correctIndex: 1,
    },
    {
      question: "Pourquoi varier occasionnellement son schéma de mise sur des mains comparables ?",
      options: ["Pour respecter une règle imposée par le club", "Pour éviter de devenir trop prévisible face aux joueurs observateurs", "Parce que c'est obligatoire en tournoi"],
      correctIndex: 1,
    },
  ],
};

async function main() {
  console.log("=== 1. Nouveaux articles FAQ (niveau Débutant) ===");
  for (const article of NEW_ARTICLES) {
    const result = await prisma.strategieArticle.upsert({
      where: { slug: article.slug },
      create: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        takeaway: article.takeaway,
        content: article.content,
        quiz: article.quiz,
        level: article.level,
        readingTime: article.readingTime,
        status: "PUBLIE",
      },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        takeaway: article.takeaway,
        content: article.content,
        quiz: article.quiz,
        level: article.level,
        readingTime: article.readingTime,
      },
    });
    console.log(`  - ${result.slug} (${result.status})`);
  }

  console.log("\n=== 2. Quiz ajoutés aux articles existants ===");
  for (const [slug, quiz] of Object.entries(EXISTING_QUIZZES)) {
    const { count } = await prisma.strategieArticle.updateMany({
      where: { slug },
      data: { quiz },
    });
    console.log(count > 0 ? `  - ${slug} : quiz ajouté` : `  - ${slug} : AUCUN article trouvé avec ce slug (ignoré)`);
  }

  console.log("\nTerminé.");
}

main()
  .catch((err) => {
    console.error("Erreur :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
