# Amical Poker Club (APCV) — site de l'association

Site web pour une association de poker : accueil avec logo animé,
calendrier des manches et inscriptions, classement de saison, forum,
actualités du club et actus poker « façon site sportif » publiées
manuellement par le bureau (ex. depuis winamax.fr), et un espace membre
protégé par connexion.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **NextAuth** (connexion par email / mot de passe)

## Démarrage rapide

```bash
npm install

cp .env.example .env
# éditez .env : DATABASE_URL (Postgres) et NEXTAUTH_SECRET
# générez un secret avec : openssl rand -base64 32

npx prisma migrate dev --name init
npm run prisma:seed   # crée une saison, 5 manches et un compte de démo

npm run dev
```

Le site est alors disponible sur http://localhost:3000.

**Compte de démonstration créé par le seed :**
`demo@apcv-poker.fr` / `motdepasse123` (rôle ADMIN — pensez à changer ce
mot de passe ou à supprimer ce compte avant la mise en production).

## Rôles et droits

Quatre niveaux de rôle (`prisma/schema.prisma`, enum `Role`) :

- `MEMBRE` — s'inscrit aux manches, participe au forum
- `RESPONSABLE` — peut en plus proposer une actu poker (soumise à
  validation) et saisir des résultats
- `BUREAU` — publie les actus poker immédiatement, valide/rejette celles
  des responsables
- `ADMIN` — accès complet

La hiérarchie est gérée dans `lib/auth.ts` (fonction `hasRole`).

## Actus poker (« façon site sportif »)

Les actus sont alimentées de deux façons complémentaires :

### 1. Synchronisation automatique (flux RSS officiels)

`lib/pokerNewsSync.ts` récupère régulièrement les derniers articles de
sources qui publient un flux RSS destiné justement à la redistribution de
leurs titres/résumés avec lien vers l'article original :

- **PokerNews** (`fr.pokernews.com/rss.php`)
- **CardPlayer** (`cardplayer.com/poker-news.rss`)

Les nouveaux articles (dédupliqués par URL) sont créés avec le statut
`PUBLIE` et le badge « Auto » — ils apparaissent immédiatement sur
`/poker-news`, sans action du bureau.

**⚠️ Winamax.fr ne propose pas de flux RSS** (vérifié) : impossible de le
synchroniser aussi proprement et automatiquement sans scraper son HTML, ce
qui serait fragile (ça casse au moindre changement de mise en page du
site) et republierait du contenu sans que Winamax l'ait explicitement mis
à disposition pour ça — contrairement à un flux RSS, qui est fait pour
être repris. Pour ces sources-là, `/admin/poker-news` propose un bouton
« Pré-remplir » : collez le lien de l'article Winamax, et le titre, le
résumé et l'image sont récupérés automatiquement depuis les balises
Open Graph de la page (le même mécanisme que l'aperçu d'un lien partagé
sur Slack ou X/Twitter) — il ne reste plus qu'à vérifier et publier.

**Déclenchement de la synchro RSS :**

- **Bouton manuel** : « 🔄 Synchroniser maintenant » sur `/admin/poker-news`
  (BUREAU/ADMIN).
- **Automatique en production** : `vercel.json` définit un Cron Job Vercel
  qui appelle `/api/poker-news/sync` une fois par jour. Renseignez la
  variable d'environnement `CRON_SECRET` sur votre projet Vercel (Vercel
  l'envoie alors automatiquement en en-tête `Authorization`, aucune config
  supplémentaire). Sur un plan payant, vous pouvez augmenter la fréquence
  dans `vercel.json` (ex. `"0 */3 * * *"` pour toutes les 3h) — le plan
  gratuit (Hobby) limite les Cron Jobs à une fois par jour.
- **Si vous n'hébergez pas sur Vercel** : appelez périodiquement
  `POST https://votre-site/api/poker-news/sync` avec l'en-tête
  `Authorization: Bearer <CRON_SECRET>`, depuis un service comme
  [cron-job.org](https://cron-job.org) ou une Action planifiée GitHub.

**Ajouter une autre source RSS** : ajoutez-la dans le tableau
`POKER_NEWS_SOURCES` de `lib/pokerNewsSync.ts` (nom + URL du flux).

### 2. Publication manuelle (bureau / responsables)

Pour les sources sans flux RSS (Winamax) : `/admin/poker-news`, avec
validation par le bureau si c'est un responsable qui propose l'actu (cf.
rôles ci-dessus).

## Synchronisation avec le site historique (Jimdo)

Le club dispose d'un ancien site, **amicalpokerclub.jimdofree.com**, qui
reste à jour pour certaines informations. `lib/jimdoSync.ts` récupère
directement son HTML public (Jimdo ne propose ni flux RSS ni API — mais
c'est le site du club lui-même, donc pas de réserve à scraper son contenu
comme il y en aurait pour un site tiers) et met à jour :

- **Annonces (Infos / Édito)** → créées en **brouillon** dans `News`, à
  relire et publier depuis `/admin/site-historique` (une relecture humaine
  est requise car ces pages peuvent contenir des informations sensibles,
  par ex. l'adresse d'un compte-rendu de réunion).
- **Partenaires** → page `/partenaires`, mise à jour directement (annuaire
  public simple, sans donnée sensible).
- **Calendrier détaillé de la saison** → affiché en bas de `/calendrier`
  comme référence en lecture seule ; **les inscriptions continuent de se
  faire uniquement sur ce nouveau site**, pour ne pas avoir deux systèmes
  d'inscription en parallèle.
- **Photos** → ajoutées à un album dédié sur `/galerie`.

Un hash du texte de chaque page évite de retraiter une page qui n'a pas
changé. **Déclenchement** : bouton « 🔄 Synchroniser maintenant » sur
`/admin/site-historique` (BUREAU/ADMIN), et automatiquement une fois par
jour via `vercel.json` (même mécanisme que la synchro poker news
ci-dessus — même variable `CRON_SECRET`).

Si Jimdo change un jour la structure de ses pages, seul ce fichier
(`lib/jimdoSync.ts`) aura besoin d'être ajusté (le sélecteur
`#cc-tp-content` cible le bloc de contenu de chaque page).

## SEO & visibilité

Le site est balisé pour le référencement naturel dès sa mise en ligne :

- **Metadata par page** (`export const metadata` / `generateMetadata`) :
  titre, description et URL canonique propres à chaque page, via le title
  template défini dans `app/layout.tsx`.
- **`app/sitemap.ts`** et **`app/robots.ts`** — générés dynamiquement par
  Next.js (`/sitemap.xml`, `/robots.txt`), excluent `/admin`,
  `/espace-membre` et `/api`.
- **Données structurées JSON-LD** (`lib/seo.ts`) : l'association en
  `SportsOrganization` sur tout le site, la prochaine manche en `Event` sur
  l'accueil, chaque article de la rubrique Stratégie en `Article`.
- **Open Graph / Twitter Card** générés dynamiquement (`app/opengraph-image.tsx`)
  et favicon/icône iOS (`app/icon.tsx`, `app/apple-icon.tsx`) à partir du
  logo du club — aucune image statique à maintenir à la main.
- **`NEXT_PUBLIC_SITE_URL`** (voir `.env.example`) doit pointer vers le nom
  de domaine réel une fois le site déployé : c'est cette valeur qui est
  utilisée pour construire les URLs canoniques, le sitemap et les balises
  de partage.

Trois nouvelles rubriques de contenu, pensées pour attirer et fidéliser des
visiteurs (recherche organique + raisons de revenir) :

- **`/strategie`** — articles de fond (règles, lexique, stratégie
  préflop, cotes et outs) rédigés une fois pour toutes dans
  `lib/strategieContent.ts` ; ajouter un article = ajouter une entrée dans
  ce tableau, aucune administration nécessaire.
- **`/vie-du-club`** — portraits de membres, gérés depuis
  `/admin/portraits` (BUREAU+). Rien n'est publié automatiquement :
  chaque portrait est rédigé et validé par le bureau, avec l'accord de la
  personne concernée.
- **Palmarès** — intégré en bas de `/classement` : le champion de chaque
  saison passée, calculé automatiquement à partir des classements déjà en
  base (respecte le choix RGPD `publicResults` de chaque membre).

## Pages principales

| Route | Description |
|---|---|
| `/` | Accueil — logo animé, prochaine manche, aperçu actus |
| `/strategie` | Articles de stratégie & pédagogie poker |
| `/vie-du-club` | Portraits de membres et vie associative |
| `/admin/portraits` | Gestion des portraits (BUREAU+) |
| `/poker-news` | Actus poker publiées |
| `/admin/poker-news` | Publication/validation des actus (RESPONSABLE+) |
| `/partenaires` | Partenaires du club (synchronisé depuis le site historique) |
| `/admin/site-historique` | Synchronisation avec amicalpokerclub.jimdofree.com (BUREAU+) |
| `/calendrier` | Manches de la saison + inscription |
| `/classement` | Classement de la saison + palmarès des saisons passées |
| `/resultats` | Résultats détaillés par manche |
| `/forum` | Forum des membres |
| `/connexion` | Connexion membre |
| `/espace-membre` | Tableau de bord membre (protégé) |

## Structure du projet

```
app/            pages et routes API (App Router)
components/     composants React réutilisables
lib/            auth.ts, prisma.ts, ranking.ts
prisma/         schema.prisma + seed.ts
```

## Déploiement

Le plus simple : [Vercel](https://vercel.com) pour l'app + une base
Postgres managée (Neon, Supabase, Railway...). Renseignez `DATABASE_URL`
et `NEXTAUTH_SECRET`/`NEXTAUTH_URL` dans les variables d'environnement du
projet, puis lancez `npx prisma migrate deploy` avant le premier
déploiement.

## À personnaliser avant mise en ligne

- Logo : le composant `components/Logo.tsx` utilise les symboles ♠♥♦♣
  animés — remplacez-le par votre logo si vous en avez un.
- Couleurs : `tailwind.config.ts`.
- Coordonnées, lieu des manches, réseaux sociaux : `components/Footer.tsx`,
  `app/contact/page.tsx`.
- Mentions légales / RGPD : `app/mentions-legales`, `app/confidentialite`
  (textes à compléter avec les informations réelles de l'association).
