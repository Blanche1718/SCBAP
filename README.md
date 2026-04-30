# SCBAP

SCBAP est une plateforme de suivi et de supervision de personnes sous mesure judiciaire au Benin. Le projet est organise en deux applications independantes:

- `scbap-backend`: API Node.js / Express / Prisma
- `scbap-frontend`: interface web React / Vite

Le depot integre deja plusieurs flux metiers:

- authentification et gestion des roles
- gestion des dossiers et beneficiaires
- synchronisation DAPG
- gestion des obligations
- stockage documentaire via MinIO
- pointage manuel et pointage biometrie / NFC
- enrôlement biometrie
- administration des utilisateurs
- dashboard par juridiction
- fondations de surveillance electronique


---

## Table des matieres

1. [Vision generale](#vision-generale)
2. [Technologies utilisees](#technologies-utilisees)
3. [Architecture du projet](#architecture-du-projet)
4. [Prerequis](#prerequis)
5. [Installation complete en local](#installation-complete-en-local)
6. [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
7. [Commandes utiles](#commandes-utiles)
8. [Fonctionnement metier](#fonctionnement-metier)
9. [Structure du backend](#structure-du-backend)
10. [Structure du frontend](#structure-du-frontend)
11. [Base de donnees Prisma](#base-de-donnees-prisma)
12. [Integrations externes](#integrations-externes)
13. [Seeds et scripts](#seeds-et-scripts)
14. [Tests fonctionnels rapides](#tests-fonctionnels-rapides)
15. [Deploiement local des webhooks](#deploiement-local-des-webhooks)
16. [Depannage](#depannage)
17. [Roadmap et etat du projet](#roadmap-et-etat-du-projet)

---

## Vision generale

SCBAP centralise le suivi des personnes concernees par des mesures judiciaires. Le projet fait le pont entre plusieurs sources:

- **DAPG** pour l'import des dossiers et de certaines donnees metiers
- **Justice / biometrie** pour l'enrôlement et le suivi des empreintes
- **Famoco / boitier de pointage** pour les pointages NFC et biometrie
- **MinIO** pour le stockage documentaire
- **PostgreSQL** pour la persistance metier

Le systeme distingue deux couches:

- **Dossier**: source metier principale, alimentee par les imports et l'administration
- **Beneficiaire**: couche technique associee au dossier, utilisee pour le suivi, les obligations, les pointages, la biometrie et la surveillance

### Concepts importants

- `Dossier`: fiche metier (nom, prenom, juridiction, prison, mandat, obligations, etc.)
- `Beneficiaire`: couche fonctionnelle de SCBAP, liee a un dossier
- `Pointage`: evenement de presence ou de biometrie
- `Obligation`: regle ou contrainte a respecter
- `Alerte`: anomalie ou violation de regle
- `Bracelet`: objet technique de la future surveillance electronique
- `Structure`: organisation de travail de l'utilisateur connecte
- `Juridiction`: territoire metier de rattachement

---

## Technologies utilisees

### Backend

- Node.js
- Express 5
- Prisma 7
- PostgreSQL
- Zod pour la validation
- bcryptjs pour les mots de passe
- jsonwebtoken pour l'authentification
- MinIO pour les documents
- exceljs pour l'export Excel
- ts-node-dev pour le mode dev

### Frontend

- React 19
- Vite 8
- React Router 7
- Tailwind CSS 4
- lucide-react pour les icones
- @fontsource pour la typographie

### Services externes

- DAPG / justice pour l'import des dossiers
- API biometrie justice pour l'enrôlement et le suivi
- ngrok pour exposer localement les webhooks lors des tests

---

## Architecture du projet

Le depot est organise en deux sous-projets:

```text
scbap/
├─ scbap-backend/
└─ scbap-frontend/
```

### Principe d'organisation backend

Le backend suit une architecture simple et lisible:

- `routes`: definition des routes HTTP
- `controllers`: reception HTTP et transformation des requetes / reponses
- `services`: logique metier
- `schemas`: schemas Zod de validation
- `integrations`: clients vers les APIs externes
- `jobs`: taches planifiees
- `scripts`: seeds et backfills
- `prisma`: schema et migrations

### Principe d'organisation frontend

Le frontend suit une organisation classique:

- `pages`: ecrans
- `components`: composants reutilisables
- `auth`: contexte et stockage d'auth
- `hooks`: chargement de donnees
- `lib`: helper d'API
- `types`: types TypeScript partages au niveau UI

### Fichiers de configuration racine

#### `scbap-backend/package.json`

- scripts backend (`dev`, `build`, `start`, seeds, backfills)
- dependances serveur, Prisma, MinIO, Zod, JWT, ExcelJS

#### `scbap-frontend/package.json`

- scripts frontend (`dev`, `build`, `lint`, `preview`)
- dependances React, Vite, Tailwind, router, icones

#### `scbap-backend/tsconfig.json`

- configuration TypeScript serveur
- compilation vers `dist`

#### `scbap-frontend/tsconfig.json`

- configuration TypeScript frontend a base de references

#### `scbap-frontend/vite.config.ts`

- configuration Vite
- activation du plugin React et du plugin Tailwind

#### `scbap-backend/docker-compose.minio.yml`

- demarre MinIO en local
- expose le service de stockage et la console web

#### `scbap-backend/.env`

- variables locales du backend

#### `scbap-frontend/.env`

- variable d'URL de l'API utilisee par Vite

---

## Prerequis

Avant de lancer le projet, il faut installer:

- Node.js 20 LTS ou plus recent
- npm
- PostgreSQL 14+ ou 15+
- Docker si tu veux utiliser MinIO via `docker compose`
- un compte ngrok si tu veux exposer le webhook local

### Avoir aussi

- un editeur TypeScript compatible
- des droits d'acces au depot
- les variables d'environnement locales pour la base, MinIO et les APIs externes

---

## Installation complete en local

### 1. Recuperer le code

```bash
git clone <URL_DU_DEPOT>
cd scbap
```

### 2. Installer les dependances backend

```bash
cd scbap-backend
npm install
```

### 3. Installer les dependances frontend

```bash
cd ../scbap-frontend
npm install
```

### 4. Preparer PostgreSQL

Le backend attend une base PostgreSQL accessible via `DATABASE_URL`.

Exemple de configuration de developpement:

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/scbap"
```

Il faut donc:

- creer la base `scbap`
- verifier que l'utilisateur PostgreSQL existe
- ajuster le mot de passe si ton environnement est different

### 5. Demarrer MinIO

Le projet utilise MinIO pour stocker les fichiers des documents.

```bash
cd scbap-backend
docker compose -f docker-compose.minio.yml up -d
```

### 6. Creer les fichiers `.env`

- `scbap-backend/.env`
- `scbap-frontend/.env`

Les details sont presentes dans la section suivante.

### 7. Appliquer les migrations Prisma

Depuis `scbap-backend`:

```bash
npx prisma generate
npx prisma migrate deploy --config prisma.config.ts
```

Si tu es en phase de developpement local et que tu dois encore creer des migrations, tu peux utiliser `migrate dev`, mais pour un clone propre il faut surtout pouvoir `deploy` les migrations deja versionnees.

### 8. Lancer les seeds utiles

Les seeds servent a preparer des donnees de test exploitables:

```bash
npm run seed:categories-obligations
npm run seed:juridictions
npm run seed:admin
npm run seed:users-juridiction
npm run seed:dossiers
npm run seed:pointages
npm run seed:alertes
```

Tu peux ensuite relancer certains seeds avec reset si besoin:

```bash
RESET_SEED=1 npm run seed:dossiers
RESET_SEED=1 npm run seed:pointages
RESET_SEED=1 npm run seed:alertes
```

### 9. Demarrer le backend

```bash
npm run dev
```

Le backend ecoute par defaut sur le port `3000`.

### 10. Demarrer le frontend

Dans `scbap-frontend`:

```bash
npm run dev
```

Vite demarre par defaut sur `http://localhost:5173`.

---

## Configuration des variables d'environnement

### Backend: `scbap-backend/.env`

Voici les variables actuellement utilisees:

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/scbap"
DAPG_BASE_URL=https://pprod-amenagementdepeine.justice.bj/api
DAPG_API_KEY=<SECRET>
MINIO_ENDPOINT=http://localhost:9002
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=scbap-documents
MINIO_REGION=us-east-1
JWT_SECRET=<SECRET>
JWT_EXPIRES_IN=12h
BCRYPT_ROUNDS=10

BIOMETRIE_API_BASE_URL=https://pprod-fingerprints.justice.bj
BIOMETRIE_API_KEY=<SECRET>
BIOMETRIE_APPLICATION=siope
BIOMETRIE_DEEP_LINK_APP=
BIOMETRIE_MANY=yes
BIOMETRIE_TIMEOUT_MS=30000
BIOMETRIE_DEBUG=true
```

### Rôle de chaque variable backend

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion a PostgreSQL |
| `DAPG_BASE_URL` | Base URL de l'API DAPG / justice |
| `DAPG_API_KEY` | Cle d'acces a l'API DAPG |
| `MINIO_ENDPOINT` | Endpoint MinIO |
| `MINIO_ACCESS_KEY` | Utilisateur MinIO |
| `MINIO_SECRET_KEY` | Mot de passe MinIO |
| `MINIO_BUCKET` | Bucket de stockage des documents |
| `MINIO_REGION` | Region logique MinIO |
| `JWT_SECRET` | Signature des tokens JWT |
| `JWT_EXPIRES_IN` | Duree de vie des tokens |
| `BCRYPT_ROUNDS` | Complexite du hash des mots de passe |
| `BIOMETRIE_API_BASE_URL` | Base URL de l'API biometrie |
| `BIOMETRIE_API_KEY` | Cle utilisee dans le client biometrie |
| `BIOMETRIE_APPLICATION` | Nom logique de l'application cote biometrie |
| `BIOMETRIE_DEEP_LINK_APP` | Deep link de l'application Famoco / justice |
| `BIOMETRIE_MANY` | Indique si l'enrôlement concerne plusieurs empreintes |
| `BIOMETRIE_TIMEOUT_MS` | Timeout des appels biometrie |
| `BIOMETRIE_DEBUG` | Active les logs debug du client biometrie |

### Note importante sur la biometrie

Le client biometrie actuel envoie la cle dans:

- le header `X-Api-Key`
- le header `Authorization: Bearer ...`
- la query `token` pour `call-get`

Cette contrainte correspond au contrat renvoye par l'API justice telle qu'elle est integree dans le projet.

### Frontend: `scbap-frontend/.env`

```env
VITE_API_URL=http://localhost:3000
```

Si tu deploies le backend ailleurs, change cette valeur.

---

## Commandes utiles

### Backend

```bash
npm run dev
npm run build
npm run start
```

### Seeds backend

```bash
npm run seed:categories-obligations
npm run seed:dossiers
npm run seed:dossiers:reset
npm run seed:dossiers:reset:all
npm run seed:juridictions
npm run seed:admin
npm run seed:users-juridiction
npm run seed:pointages
npm run seed:pointages:reset
npm run seed:alertes
npm run seed:alertes:reset
npm run backfill:beneficiaire-statuts
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

---

## Fonctionnement metier

### 1. Authentification

Le systeme utilise des JWT.

- l'utilisateur se connecte via `/auth/login`
- le token est stocke cote frontend
- `RequireAuth` protege l'interface
- `RequireRole` restreint certaines pages a `ADMIN`

### 2. Dashboard

Le tableau de bord affiche:

- total beneficiaires
- beneficiaires actifs
- beneficiaires a configurer
- pointages / evenements
- statistiques par juridiction

Le dashboard est filtre:

- un agent ne voit que sa juridiction
- un admin voit le global et peut filtrer

### 3. Dossiers

`Dossier` represente la fiche metier.

Fonctions:

- liste des dossiers
- detail dossier
- export Excel
- modification
- suppression logique
- synchronisation DAPG
- consultation des obligations d'un dossier

### 4. Beneficiaires

`Beneficiaire` est la couche technique liee au dossier.

On y trouve:

- statut technique
- statut de profil
- enrôlement biometrie
- badge NFC
- QR code
- historique des pointages
- alertes

### 5. Obligations

Les obligations peuvent etre:

- importees de DAPG
- structurees
- creees manuellement

Elles servent aux regles de pointage, de couvre-feu, de zone, etc.

### 6. Documents

Les documents sont stockes dans MinIO.

Flux:

- creation d'une fiche document
- televersement du fichier brut
- stockage dans MinIO
- generation d'une URL de telechargement signee

### 7. Pointage

Le module pointage gere:

- le pointage manuel
- le pointage biometrie
- la recherche par NFC
- l'export / consultation

### 8. Biometrie

Le module biometrie gere:

- le lancement d'un enrôlement
- le suivi de statut
- la correlation avec le beneficiaire

Le backend suit un modele hybride:

- appel initial a l'API justice
- suivi local du code
- scheduler de verification espacee

### 9. Administration

L'admin peut:

- lister les utilisateurs
- modifier un utilisateur
- reinitialiser un mot de passe
- visualiser les metadonnees de roles / structures

Les utilisateurs non-admin ont a la place une page `Configuration`.

### 10. Surveillance electronique

Le modele de donnees est deja prepare:

- bracelets
- affectations
- positions GPS
- zones
- regles horaires
- incidents

La couche UI / simulation doit encore evoluer mais l'architecture de base est la.

---

## Structure du backend

### Entree principale

#### `scbap-backend/src/index.ts`

Point d'entree de l'API.

Role:

- charge les variables d'environnement
- initialise Express
- active CORS et `express.json()`
- monte `/auth`
- monte `/webhooks` avant l'authentification
- monte les routes protegees
- lance le scheduler biometrie
- expose la route de healthcheck `/health`

### Connexion Prisma

#### `scbap-backend/src/prisma.ts`

Crée le client Prisma avec l'adapter PostgreSQL.

Role:

- lit `DATABASE_URL`
- instancie `PrismaClient`
- exporte le client partage dans toute l'API

### Gestion des erreurs

#### `scbap-backend/src/errorHandler.ts`

Gestionnaire d'erreurs global.

Role:

- traduit `HttpError`
- traduit `ZodError`
- traduit les erreurs Prisma courantes (`P2002`, `P2003`, `P2025`)
- renvoie des messages propres au frontend

### Types Express

#### `scbap-backend/src/types/express.d.ts`

Etend `Request` pour inclure `req.user`.

Role:

- permet de typer correctement l'utilisateur authentifie

---

## Structure backend par domaines

### Auth

#### `src/auth/auth.middleware.ts`

- `requireAuth`
- `requireRole`

#### `src/auth/auth.service.ts`

- generation / verification des tokens
- recuperation de l'utilisateur authentifie

#### `src/auth/auth.types.ts`

- type `AuthenticatedUser`

#### `src/controllers/auth.controller.ts`

- `loginController`
- `meController`

#### `src/routes/auth.routes.ts`

- `POST /auth/login`
- `GET /auth/me`

#### `src/schemas/auth.schema.ts`

- validation du login

### Beneficiaires

#### `src/controllers/beneficiaire.controller.ts`

- liste des beneficiaires
- detail d'un beneficiaire
- mise a jour
- confirmation du profil
- synchronisation des obligations specifiques

#### `src/services/beneficiaire.service.ts`

- logique de lecture ecriture des beneficiaires
- calcul des statuts
- mise a jour du badge NFC et de la biometrie

#### `src/routes/beneficiaire.routes.ts`

- routes REST de la ressource beneficiaire

#### `src/schemas/beneficiaire.schema.ts`

- validation des payloads beneficiaire

### Biometrie

#### `src/controllers/biometrie.controller.ts`

- demarrage d'enrôlement
- lecture du statut local d'enrôlement

#### `src/services/biometrie.service.ts`

- appel de l'API biometrie
- enregistrement du code d'enrôlement
- gestion des statuts locaux
- calcul des prochaines verifications

#### `src/integrations/biometrie/client.ts`

- client HTTP vers l'API justice biometrie
- debug optionnel
- retry
- timeout

#### `src/integrations/biometrie/config.ts`

- lecture des variables biometrie

#### `src/jobs/biometrie.scheduler.ts`

- verification differee des enrôlements `EN_COURS`
- cadence limitee pour ne pas saturer l'API externe

#### `src/routes/biometrie.routes.ts`

- `POST /biometrie/enrolement`
- `GET /biometrie/:code/status`

#### `src/schemas/biometrie.schema.ts`

- validation des requetes biometrie

### DAPG / import externe

#### `src/controllers/dapg-import.controller.ts`

- synchro d'un dossier DAPG
- synchro globale

#### `src/services/dapg-import.service.ts`

- recuperation de la source externe
- mapping vers les dossiers SCBAP

#### `src/integrations/dapg/client.ts`

- client HTTP DAPG

#### `src/integrations/dapg/config.ts`

- configuration DAPG

#### `src/integrations/dapg/dossier.mapper.ts`

- transformation des donnees DAPG en structures SCBAP

#### `src/integrations/dapg/types.ts`

- types de reponse DAPG

#### `src/routes/dapg-import.routes.ts`

- `POST /dapg-import/sync/:dapgId`
- `POST /dapg-import/sync-all`

### Dashboard

#### `src/controllers/dashboard.controller.ts`

- statistiques
- evenements
- compliance
- tendance compliance

#### `src/services/dashboard.service.ts`

- calcul des KPIs
- filtrage par juridiction

#### `src/routes/dashboard.routes.ts`

- routes du dashboard

### Dossiers

#### `src/controllers/dossier.controller.ts`

- liste
- detail
- mise a jour
- suppression logique
- export Excel

#### `src/services/dossier.service.ts`

- logique de lecture/filtrage/pagination
- export des dossiers en Excel

#### `src/routes/dossier.routes.ts`

- routes des dossiers et de leurs obligations

#### `src/schemas/dossier.schema.ts`

- validation des entrees dossier

### Documents

#### `src/controllers/document.controller.ts`

- liste des documents
- creation du document
- upload du fichier
- telechargement

#### `src/services/document.service.ts`

- orchestration du stockage document
- utilisation de MinIO

#### `src/integrations/storage/minio.config.ts`

- lecture de la configuration MinIO

#### `src/integrations/storage/minio.ts`

- client MinIO
- creation automatique du bucket
- upload et URL signee

#### `src/routes/document.routes.ts`

- route de telechargement

### Juridictions

#### `src/controllers/juridiction.controller.ts`

- liste des juridictions

#### `src/services/juridiction.service.ts`

- logique de lecture juridiction

#### `src/routes/juridiction.routes.ts`

- `GET /juridictions`

#### `src/utils/juridiction.ts`

- normalisation des codes juridiction

### Obligations

#### `src/controllers/obligation.controller.ts`

- lecture
- creation
- mise a jour
- validation

#### `src/services/obligation.service.ts`

- logique metier obligation

#### `src/routes/obligation.routes.ts`

- routes obligation

#### `src/schemas/obligation.schema.ts`

- validation des obligations

#### `src/controllers/categorie-obligation.controller.ts`

- CRUD des categories d'obligation

#### `src/services/categorie-obligation.service.ts`

- logique categorie d'obligation

#### `src/routes/categorie-obligation.routes.ts`

- routes des categories d'obligations

#### `src/schemas/categorie-obligation.schema.ts`

- validation des categories

### Pointages

#### `src/controllers/pointage.controller.ts`

- liste des pointages
- detail d'un pointage

#### `src/services/pointage.service.ts`

- filtrage
- pagination
- detail
- creation d'un pointage biometrie depuis webhook externe

#### `src/routes/pointage.routes.ts`

- routes de consultation des pointages

#### `src/schemas/pointage-webhook.schema.ts`

- validation du payload entrant du webhook pointage

#### `src/controllers/pointage-webhook.controller.ts`

- reception du pointage biometrie

#### `src/routes/webhooks.routes.ts`

- `POST /webhooks/pointages/biometrie`

### Utilisateurs / administration

#### `src/controllers/user.controller.ts`

- liste des utilisateurs
- meta admin
- modification admin
- modification du profil courant
- changement de mot de passe
- reset du mot de passe par l'admin

#### `src/services/user.service.ts`

- logique utilisateur
- lecture par role
- update admin et self-service

#### `src/routes/users.routes.ts`

- routes admin et profil utilisateur

#### `src/schemas/user.schema.ts`

- validation des formulaires utilisateur

### Scripts

#### `src/scripts/seed-admin.ts`

- cree ou verifie le compte administrateur

#### `src/scripts/seed-users-juridiction.ts`

- cree des utilisateurs agents rattaches a des juridictions

#### `src/scripts/seed-juridictions.ts`

- cree les juridictions de reference

#### `src/scripts/seed-dossiers.ts`

- genere des dossiers de test
- peut aussi remettre a zero les donnees seedees

#### `src/scripts/seed-pointages.ts`

- genere des pointages de test

#### `src/scripts/seed-alertes.ts`

- genere des alertes de test

#### `src/scripts/seed-categories-obligations.ts`

- cree les categories d'obligations

#### `src/scripts/backfill-beneficiaire-statuts.ts`

- corrige ou complete les statuts des beneficiaires existants

### Utils / support

#### `src/errorHandler.ts`

- decrit plus haut, mais il est central a toute l'API

#### `src/prisma.ts`

- client Prisma partage

---

## Structure du frontend

### Entree principale

#### `scbap-frontend/src/main.tsx`

- monte React
- injecte `AuthProvider`
- charge `App`

#### `scbap-frontend/src/App.tsx`

- definit toutes les routes
- protege les routes avec `RequireAuth`
- limite certaines routes a `ADMIN` via `RequireRole`

### Layout

#### `src/components/layout/AppLayout.tsx`

- structure globale de l'application
- sidebar
- header mobile
- menu conditionnel selon le role

Comportement actuel:

- `ADMIN` voit aussi `Dossiers` et `Administration`
- les autres utilisateurs voient `Configuration` a la place

### Auth

#### `src/auth/AuthContext.tsx`

- contexte global d'authentification
- login
- logout
- bootstrap de session
- rechargement du user courant

#### `src/auth/authStorage.ts`

- stockage local du token JWT
- gestion memoire + `localStorage`

#### `src/components/auth/RequireAuth.tsx`

- protege les routes authentifiees

#### `src/components/auth/RequireRole.tsx`

- protege les routes reservees a certains roles

### UI de base

#### `src/components/ui/index.tsx`

Composants generiques reutilisables:

- `Badge`
- `Button`
- `Input`
- `Textarea`
- `Select`
- `Card`

Ces composants servent de base a la coherence visuelle de l'app.

### Hooks

#### `src/hooks/useBeneficiaires.ts`

- charge la liste des beneficiaires

#### `src/hooks/useDossiers.ts`

- charge la liste des dossiers

#### `src/hooks/usePointages.ts`

- charge la liste des pointages

### Client API

#### `src/lib/api.ts`

- wrapper `fetch`
- injection automatique du token JWT
- gestion standardisee des erreurs
- aide au telechargement de fichiers

### Types

#### `src/types/index.ts`

- types partages par les pages et les hooks
- beneficaires
- dossiers
- pointages
- alertes
- pagination

### Pages

#### `src/pages/LoginPage.tsx`

- ecran de connexion

#### `src/pages/DashboardPage.tsx`

- tableau de bord principal

#### `src/pages/ConfigurationPage.tsx`

- page de configuration personnelle pour les non-admins

#### `src/pages/Placeholder.tsx`

- ecran de remplacement pour les modules encore partiels

#### `src/pages/admin/AdministrationPage.tsx`

- console admin des utilisateurs

#### `src/pages/beneficiaires/BeneficiairesPage.tsx`

- liste des beneficiaires

#### `src/pages/beneficiaires/BeneficiaireDetailPage.tsx`

- detail d'un beneficiaire
- action biometrie
- lecture du statut biometrie
- affichage du badge NFC

#### `src/pages/dossiers/DossiersPage.tsx`

- liste des dossiers
- export Excel
- synchronisation DAPG

#### `src/pages/dossiers/DossierDetailPage.tsx`

- detail complet d'un dossier

#### `src/pages/dossiers/DossierFormPage.tsx`

- formulaire de creation ou modification de dossier

#### `src/pages/pointages/PointagesPage.tsx`

- liste des pointages

#### `src/pages/pointages/PointageDetailPage.tsx`

- detail d'un pointage

### Styles

#### `src/index.css`

- theme global
- couleurs
- typographies
- reset de base

#### `src/App.css`

- styles legacy / transition

---

## Base de donnees Prisma

### Fichier central

#### `scbap-backend/prisma/schema.prisma`

Le schema contient les entites suivantes:

- `Structure`
- `Juridiction`
- `Role`
- `User`
- `Dossier`
- `Beneficiaire`
- `Document`
- `CategorieObligation`
- `Obligation`
- `Pointage`
- `DemandeAutorisation`
- `Justificatif`
- `Alerte`
- `Notification`
- `Rapport`
- `Bracelet`
- `AffectationBracelet`
- `PositionGPS`
- `Zone`
- `RegleHoraire`
- `IncidentBracelet`
- `HistoriqueAction`

### Points importants du schema

- `Dossier` est la source metier principale
- `Beneficiaire` est associe 1-1 a `Dossier`
- `badgeNfc` est unique cote beneficiaire
- `biometrieEnrolementCode` est unique cote beneficiaire
- `Pointage` stocke les metadonnees externes NFC / biometrie
- le modele `Bracelet` et ses entites associees preparent la surveillance electronique

### Configuration Prisma

#### `scbap-backend/prisma.config.ts`

- indique a Prisma ou se trouve `schema.prisma`
- indique le dossier des migrations
- lit `DATABASE_URL`

### Backfills et scripts SQL

#### `scbap-backend/prisma/enable_pgcrypto.sql`

- active l'extension `pgcrypto` si necessaire pour les fonctions UUID

#### `scbap-backend/prisma/backfill-beneficiaire-statuts.sql`

- script SQL ponctuel pour reparer ou completer des donnees existantes

### Migrations versionnees

Chaque migration correspond a une etape fonctionnelle du projet.

| Migration | Rôle principal |
|---|---|
| `20260413104732_init` | creation initiale du schema |
| `20260414214839_obligation_validation` | validation des obligations |
| `20260414215331_obligation_validation` | correctif lie aux obligations |
| `20260414220000_beneficiaire_profile_lock_and_obligation_source` | verrouillage profil / origine des obligations |
| `20260415000000_documents_storage` | stockage des documents |
| `20260422085911_add_profil_statut` | ajout du statut de profil beneficiaire |
| `20260422093000_add_juridictions` | creation de la table juridictions |
| `20260424000000_biometrie_enrolement` | enrôlement biometrie |
| `20260424093000_biometrie_verification_scheduler` | planification de verification biometrie |
| `20260424120000_pointage_webhook_nfc` | pointage NFC et webhook biometrie |

---

## Integrations externes

### 1. DAPG / justice

But:

- importer des dossiers
- synchroniser les liberations conditionnelles
- alimenter la base SCBAP

Points de configuration:

- `DAPG_BASE_URL`
- `DAPG_API_KEY`

Le code d'integration se trouve dans:

- `src/integrations/dapg/client.ts`
- `src/integrations/dapg/config.ts`
- `src/integrations/dapg/dossier.mapper.ts`
- `src/integrations/dapg/types.ts`

### 2. Biometrie justice

But:

- lancer un enrôlement
- suivre l'etat d'un code
- recevoir les reponses selon le contrat fourni par l'API externe

Points de configuration:

- `BIOMETRIE_API_BASE_URL`
- `BIOMETRIE_API_KEY`
- `BIOMETRIE_APPLICATION`
- `BIOMETRIE_DEEP_LINK_APP`
- `BIOMETRIE_MANY`
- `BIOMETRIE_TIMEOUT_MS`

Le client biometrie:

- envoie `X-Api-Key`
- envoie aussi `Authorization: Bearer ...`
- ajoute `token` en query sur `call-get`
- supporte un mode debug par `BIOMETRIE_DEBUG=true`

### 3. MinIO

But:

- stocker les pieces jointes des dossiers / beneficiaires

Configuration:

- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_REGION`

Le bucket est cree automatiquement si besoin par le backend.

### 4. Webhooks externes

Le backend expose une route publique:

```text
POST /webhooks/pointages/biometrie
```

Elle attend un payload de ce type:

```json
{
  "nfc": "xxxxxxxxxx",
  "timestamp": "2026-04-21T09:15:30Z",
  "centreNom": "Commissariat de X",
  "deviceId": "FAMOCO-AX23-001",
  "success": true
}
```

Cette route est pensue pour etre appelee par:

- Postman
- ngrok
- un vrai boitier / service externe

---

## Seeds et scripts

### Seed roles / users

#### `seed:admin`

- cree le compte administrateur
- role: `ADMIN`

#### `seed:users-juridiction`

- cree des utilisateurs agents par juridiction
- role typique: `AGENT_SPIP`

### Seed domaines metiers

#### `seed:juridictions`

- cree les juridictions de base:
  - Cotonou
  - Porto-Novo
  - Parakou
  - Abomey
  - Natitingou

#### `seed:categories-obligations`

- cree les categories metiers d'obligation

#### `seed:dossiers`

- cree des dossiers de test
- associe beneficiaires et obligations
- permet de simuler des donnees DAPG

#### `seed:pointages`

- cree des pointages de test sur les beneficiaires existants

#### `seed:alertes`

- cree des alertes de test

### Reset et backfill

- `seed:dossiers:reset`
- `seed:dossiers:reset:all`
- `seed:pointages:reset`
- `seed:alertes:reset`
- `backfill:beneficiaire-statuts`

Ces scripts servent a remettre a plat une base de dev ou a corriger des donnees historiques.

### Parametres de reset

Certains scripts lisent:

- `RESET_SEED=1`
- `RESET_ALL=1`

Utilise ces flags avec prudence, car ils suppriment les donnees seedees.

---

## Tests fonctionnels rapides

### 1. Connexion

1. Ouvre le frontend
2. Va sur `/login`
3. Connecte-toi avec un compte seed

### 2. Dashboard

Vérifie:

- les statistiques
- le filtrage par juridiction
- le role admin / agent

### 3. Dossiers

Vérifie:

- la liste
- le detail
- l'export Excel
- la synchronisation DAPG

### 4. Beneficiaire + biometrie

Vérifie:

- bouton `Configurer`
- passage en `EN_COURS`
- passage en `CONFIRME`
- affichage du code d'enrôlement si besoin

### 5. Pointage NFC

Test local via Postman:

```http
POST http://localhost:3000/webhooks/pointages/biometrie
Content-Type: application/json

{
  "nfc": "NFC-TEST-001",
  "timestamp": "2026-04-21T09:15:30Z",
  "centreNom": "Commissariat de X",
  "deviceId": "FAMOCO-AX23-001",
  "success": true
}
```

Si un beneficiaire porte deja ce NFC, un pointage doit etre cree.

### 6. Documents

Vérifie:

- creation de document
- upload de fichier
- telechargement

### 7. Administrateur

Vérifie:

- liste utilisateurs
- edition utilisateur
- reset password
- acces aux dossiers

---

## Deploiement local des webhooks

Pour tester les webhooks sans deploiement public:

1. Lance le backend:

```bash
cd scbap-backend
npm run dev
```

2. Lance ngrok:

```bash
ngrok http 3000
```

3. Récupère l'URL publique fournie par ngrok.

4. Utilise:

```text
POST https://<ton-sous-domaine>.ngrok-free.dev/webhooks/pointages/biometrie
```

Le webhook est accessible sans authentification SCBAP, ce qui facilite les tests avec un service externe.

---

## Depannage

### La base PostgreSQL ne repond pas

Symptome:

- erreurs Prisma
- `localhost:5432 - no response`
- `The column ... does not exist`

Actions:

1. verifier que PostgreSQL est demarre
2. verifier que `DATABASE_URL` pointe vers la bonne base
3. lancer:

```bash
npx prisma migrate deploy --config prisma.config.ts
```

### MinIO ne fonctionne pas

Vérifie:

- `docker compose -f docker-compose.minio.yml up -d`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`

### L'API biometrie renvoie `Token manquant`

Verifier:

- `BIOMETRIE_API_BASE_URL` doit etre en `https`
- `BIOMETRIE_API_KEY` doit etre renseignee
- `BIOMETRIE_DEEP_LINK_APP` peut etre vide en mode web
- le mode debug `BIOMETRIE_DEBUG=true` permet de voir la requete exacte

### Le frontend ne voit pas l'API

Verifier:

- `VITE_API_URL=http://localhost:3000`
- le backend tourne bien
- le token JWT est present dans `localStorage`

### Les routes admin ne s'affichent pas

Verifier:

- l'utilisateur courant a bien le role `ADMIN`
- `AppLayout.tsx` lit correctement `user.role.nom`

---

## Notes de reprise pour un nouveau developpeur

Si tu reprends ce projet pour la premiere fois, commence par:

1. `scbap-backend/src/index.ts`
2. `scbap-backend/prisma/schema.prisma`
3. `scbap-frontend/src/App.tsx`
4. `scbap-frontend/src/components/layout/AppLayout.tsx`
5. `scbap-backend/src/services/beneficiaire.service.ts`
6. `scbap-backend/src/services/pointage.service.ts`
7. `scbap-backend/src/services/biometrie.service.ts`

Ensuite lis:

- `scbap-backend/src/routes/*`
- `scbap-backend/src/controllers/*`
- `scbap-backend/src/integrations/*`
- `scbap-backend/src/scripts/*`

---

## Etat du projet

Le projet est deja operationnel pour:

- login
- dashboard
- dossiers
- beneficiaires
- documents
- pointages
- biometrie
- administration
- juridictions
- import DAPG

La partie surveillance electronique est en grande partie preparee au niveau du schema et de la structure, avec une logique de simulation prevue pour remplacer un vrai bracelet tant que le materiel n'est pas disponible.

---

## Contribution

Avant toute modification importante:

- verifier les migrations Prisma
- verifier les seeds
- verifier le role des routes
- verifier l'impact frontend / backend

Pour une nouvelle fonctionnalite, respecter la structure existante:

- `schemas` pour la validation
- `services` pour la logique
- `controllers` pour l'HTTP
- `routes` pour l'exposition
- `types` pour le frontend

---

## License

Projet prive SCBAP. Adapter selon la politique du depot si besoin.
