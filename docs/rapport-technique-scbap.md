# Rapport technique brut - SCBAP

Ce document rassemble les informations techniques reelles du projet SCBAP afin de servir de base au chapitre 2 du memoire. Il est volontairement detaille et oriente implementation.

---

## 1. Contexte technique du projet

SCBAP est une plateforme web de supervision judiciaire concue pour centraliser le suivi des personnes beneficiaires d'une mesure d'amenagement de peine.

L'objectif technique est de fournir une application capable de :

- importer ou gerer des dossiers judiciaires ;
- creer une couche technique `Beneficiaire` associee au dossier ;
- suivre les obligations imposees au beneficiaire ;
- gerer les pointages manuels, NFC et biometriques ;
- integrer une API externe DAPG ;
- integrer une API de biometrie justice ;
- stocker des documents justificatifs ;
- suivre les alertes et notifications ;
- exposer un portail public aux services externes ;
- recevoir la telemetrie d'un bracelet electronique via MQTT ;
- diffuser les positions et alertes en temps reel par WebSocket ;
- afficher une carte de surveillance GPS cote frontend.

Le systeme distingue deux notions importantes :

- `Dossier` : fiche judiciaire et metier, souvent alimentee par la DAPG.
- `Beneficiaire` : couche technique de suivi, liee a un dossier, utilisee pour les obligations, pointages, documents, biometrie, bracelet et alertes.

---

## 2. Stack technique complete

### Backend

Le backend est une API Node.js ecrite en TypeScript.

Technologies principales :

- Node.js ;
- Express 5 ;
- TypeScript ;
- Prisma 7 ;
- PostgreSQL ;
- Zod ;
- JWT ;
- bcryptjs ;
- MinIO ;
- MQTT ;
- WebSocket natif via `ws` ;
- Nodemailer ;
- ExcelJS.

Le point d'entree est :

```text
scbap-backend/src/index.ts
```

Le backend expose une API REST, des webhooks publics, un subscriber MQTT et un serveur WebSocket.

### Frontend

Le frontend est une application React/Vite.

Technologies principales :

- React 19 ;
- Vite 8 ;
- TypeScript ;
- React Router 7 ;
- Tailwind CSS 4 ;
- lucide-react ;
- Leaflet / React Leaflet ;
- WebSocket natif cote navigateur.

Le point d'entree frontend est :

```text
scbap-frontend/src/main.tsx
scbap-frontend/src/App.tsx
```

### Base de donnees

La base de donnees est PostgreSQL, manipulee par Prisma.

Fichier central :

```text
scbap-backend/prisma/schema.prisma
```

### Temps reel

Le temps reel utilise WebSocket natif, via la librairie backend `ws`.

Endpoint WebSocket :

```text
/ws/surveillance
```

Le WebSocket sert surtout a transmettre :

- snapshot initial de surveillance ;
- telemetries bracelet ;
- alertes de surveillance.

### Authentification

Le backend utilise :

- JWT pour l'authentification applicative ;
- cookie HTTP pour la session navigateur ;
- bearer token comme alternative ;
- bcryptjs pour le hachage des mots de passe ;
- roles pour l'autorisation.

Deux systemes d'authentification existent :

- auth interne SCBAP : utilisateurs agents/admin ;
- auth portail : services externes avec code d'acces.

### Validation

La validation des entrees est realisee avec Zod dans :

```text
scbap-backend/src/schemas/
```

Schemas importants :

- `auth.schema.ts`
- `dossier.schema.ts`
- `beneficiaire.schema.ts`
- `obligation.schema.ts`
- `pointage-webhook.schema.ts`
- `bracelet-telemetry.schema.ts`
- `portail.schema.ts`
- `service-externe.schema.ts`
- `rapport.schema.ts`
- `user.schema.ts`

### Upload et documents

Le stockage documentaire utilise MinIO, compatible S3.

Flux :

1. creation d'une fiche document ;
2. generation d'un `objectKey` ;
3. upload binaire ;
4. stockage dans MinIO ;
5. generation d'une URL de telechargement.

Fichiers :

```text
scbap-backend/src/services/document.service.ts
scbap-backend/src/integrations/storage/minio.ts
scbap-backend/src/integrations/storage/minio.config.ts
```

### Cartographie

Le frontend utilise Leaflet via `react-leaflet`.

Fichier principal :

```text
scbap-frontend/src/pages/surveillance/GpsMapPage.tsx
```

La carte affiche :

- traces GPS ;
- beneficiaires sous surveillance ;
- niveaux de risque ;
- zones autorisees/interdites ;
- evenements temps reel.

---

## 3. Architecture generale

Architecture globale :

```text
Navigateur React
      |
      | HTTP REST + WebSocket
      v
Backend Express / Node.js
      |
      | Prisma
      v
PostgreSQL

Backend Express
      |
      | MinIO SDK
      v
MinIO

Bracelet / simulateur
      |
      | MQTT
      v
Broker MQTT
      |
      | Subscriber backend
      v
Backend Express
```

Le backend est organise selon une separation simple :

```text
src/
  auth/
  controllers/
  integrations/
  jobs/
  routes/
  schemas/
  scripts/
  services/
  types/
  utils/
```

### Role des couches backend

| Couche | Role |
| --- | --- |
| `routes` | Declaration des endpoints Express. |
| `controllers` | Lecture de la requete, appel service, reponse HTTP. |
| `services` | Logique metier et acces Prisma. |
| `schemas` | Validation Zod. |
| `integrations` | Clients DAPG, biometrie, MQTT, MinIO, NFC. |
| `jobs` | Taches planifiees. |
| `scripts` | Seeds, backfills et simulation bracelet. |
| `auth` | Authentification, roles, cookies, portail. |

### Initialisation backend

Dans `src/index.ts`, l'application :

1. charge les variables d'environnement ;
2. initialise Express ;
3. active CORS ;
4. active `express.json()` ;
5. monte les routes publiques : `/auth`, `/portail`, `/webhooks`, `/health` ;
6. applique `requireAuth` ;
7. monte les routes protegees ;
8. initialise WebSocket ;
9. demarre les jobs ;
10. demarre le subscriber MQTT.

Routes publiques :

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /portail/auth/request-code
POST /portail/auth
GET  /health
POST /webhooks/pointages/biometrie
```

Routes protegees apres `requireAuth` :

```text
/categories-obligations
/dossiers
/obligations
/beneficiaires
/documents
/pointages
/dapg-import
/dashboard
/juridictions
/users
/biometrie
/alertes
/notifications
/services-externes
/rapports
```

---

## 4. Structure backend detaillee

### Authentification

Fichiers :

```text
src/auth/auth.service.ts
src/auth/auth.middleware.ts
src/auth/auth-cookie.ts
src/auth/portal-auth.service.ts
src/auth/portal-auth.middleware.ts
```

Fonctions principales :

- login utilisateur ;
- verification JWT ;
- lecture du cookie d'authentification ;
- protection des routes ;
- controle des roles ;
- rate limit simple sur les tentatives de connexion ;
- invalidation de session par `sessionVersion`.

### Dossiers

Fichiers :

```text
src/routes/dossier.routes.ts
src/controllers/dossier.controller.ts
src/services/dossier.service.ts
src/schemas/dossier.schema.ts
```

Fonctions :

- liste paginee ;
- recherche ;
- filtre par juridiction selon utilisateur ;
- creation ;
- modification ;
- suppression logique ;
- export Excel ;
- consultation des obligations.

### Beneficiaires

Fichiers :

```text
src/routes/beneficiaire.routes.ts
src/controllers/beneficiaire.controller.ts
src/services/beneficiaire.service.ts
```

Fonctions :

- liste paginee ;
- detail ;
- mise a jour profil ;
- confirmation du profil ;
- synchronisation des obligations specifiques ;
- documents ;
- zones ;
- evaluations de services externes.

### Pointages

Fichiers :

```text
src/routes/pointage.routes.ts
src/routes/webhooks.routes.ts
src/controllers/pointage.controller.ts
src/controllers/pointage-webhook.controller.ts
src/services/pointage.service.ts
src/schemas/pointage-webhook.schema.ts
```

Fonctions :

- liste des pointages ;
- detail pointage ;
- webhook public de pointage biometrie ;
- creation de pointage a partir d'un badge NFC ;
- detection d'absences ;
- creation de notifications en cas d'anomalie.

### Surveillance electronique

Fichiers :

```text
src/integrations/mqtt/config.ts
src/integrations/mqtt/client.ts
src/services/mqtt.service.ts
src/services/bracelet-telemetry.service.ts
src/services/surveillance-realtime.service.ts
src/jobs/surveillance-health.job.ts
src/scripts/simulate-bracelet.ts
```

Fonctions :

- connexion au broker MQTT ;
- abonnement aux topics ;
- validation du payload bracelet ;
- association `device_id` avec `Bracelet.codeImei` ;
- creation de position GPS ;
- mise a jour du statut bracelet ;
- creation d'alertes de surveillance ;
- creation d'incidents ;
- diffusion WebSocket ;
- detection des bracelets hors ligne par job.

### Documents

Fichiers :

```text
src/routes/document.routes.ts
src/controllers/document.controller.ts
src/services/document.service.ts
src/integrations/storage/minio.ts
```

Fonctions :

- creation fiche document ;
- upload fichier binaire ;
- stockage MinIO ;
- URL de telechargement ;
- suppression.

### Services externes et portail

Fichiers :

```text
src/routes/service-externe.routes.ts
src/routes/portail.routes.ts
src/services/service-externe.service.ts
src/services/portail.service.ts
src/auth/portal-auth.service.ts
```

Fonctions :

- creation service externe ;
- generation code d'acces ;
- affectation d'un service a un beneficiaire ;
- portail public ;
- evaluation mensuelle/ponctuelle ;
- documents d'evaluation ;
- notifications a reception d'evaluation.

### Rapports

Fichiers :

```text
src/routes/rapport.routes.ts
src/controllers/rapport.controller.ts
src/services/rapport.service.ts
src/jobs/monthly-rapport.job.ts
```

Fonctions :

- rapports pre-remplis ;
- brouillons ;
- finalisation ;
- reouverture ;
- liste des evaluations recues ;
- liste des documents recus ;
- generation mensuelle planifiee.

---

## 5. API REST principale

### Auth

| Methode | Endpoint | Role |
| --- | --- | --- |
| POST | `/auth/login` | Connexion utilisateur. |
| POST | `/auth/logout` | Deconnexion. |
| GET | `/auth/me` | Recuperation utilisateur courant. |

### Dossiers

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/dossiers` | Liste paginee des dossiers. |
| GET | `/dossiers/export` | Export Excel. |
| POST | `/dossiers/dapg/sync` | Synchronisation globale DAPG. |
| POST | `/dossiers/dapg/:dapgId/sync` | Synchronisation d'un dossier DAPG. |
| POST | `/dossiers` | Creation manuelle. |
| GET | `/dossiers/:id` | Detail dossier. |
| PUT | `/dossiers/:id` | Mise a jour. |
| DELETE | `/dossiers/:id` | Suppression logique. |
| GET | `/dossiers/:dossierId/obligations` | Obligations du dossier. |
| POST | `/dossiers/:dossierId/obligations` | Creation obligation. |

### Beneficiaires

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/beneficiaires` | Liste beneficiaires. |
| GET | `/beneficiaires/:id` | Detail beneficiaire. |
| PATCH | `/beneficiaires/:id` | Mise a jour. |
| PATCH | `/beneficiaires/:id/profil/confirmer` | Confirmation profil. |
| POST | `/beneficiaires/:id/obligations/specifiques` | Synchronisation obligations specifiques. |
| GET | `/beneficiaires/:id/documents` | Documents. |
| POST | `/beneficiaires/:id/documents` | Creation document. |
| PUT | `/beneficiaires/:id/documents/:documentId/file` | Upload document. |
| GET | `/beneficiaires/:id/zones` | Zones de surveillance. |
| POST | `/beneficiaires/:id/zones` | Creation zone. |
| PATCH | `/beneficiaires/zones/:zoneId` | Modification zone. |
| DELETE | `/beneficiaires/zones/:zoneId` | Suppression zone. |

### Pointages

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/pointages` | Liste pointages. |
| GET | `/pointages/:id` | Detail pointage. |
| POST | `/pointages/system/check-absences` | Detection manuelle des absences. |
| POST | `/webhooks/pointages/biometrie` | Webhook public Famoco/biometrie. |

### Biometrie

| Methode | Endpoint | Role |
| --- | --- | --- |
| POST | `/biometrie/enrolement` | Demande d'enrolement. |
| GET | `/biometrie/:code/status` | Verification statut. |
| POST | `/biometrie/:beneficiaireId/force-verify` | Verification forcee. |
| POST | `/biometrie/nfc/sync` | Synchronisation badges NFC, admin. |

### Alertes et notifications

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/alertes` | Liste alertes surveillance. |
| PATCH | `/alertes/:id/traiter` | Marquer traitee. |
| GET | `/notifications` | Liste notifications. |
| PATCH | `/notifications/:id/lire` | Marquer lue. |
| PATCH | `/notifications/lire-tout` | Marquer toutes lues. |

### Dashboard

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/dashboard/stats` | Statistiques globales. |
| GET | `/dashboard/events` | Evenements. |
| GET | `/dashboard/compliance` | Conformite. |
| GET | `/dashboard/compliance/trend` | Evolution conformite. |

### Services externes et portail

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/services-externes` | Liste services. |
| POST | `/services-externes` | Creation service. |
| GET | `/services-externes/:id` | Detail service. |
| PUT | `/services-externes/:id` | Modification service. |
| POST | `/services-externes/affectations` | Affectation a un beneficiaire. |
| POST | `/services-externes/:id/reset-access-code` | Nouveau code d'acces. |
| POST | `/portail/auth/request-code` | Demande code portail. |
| POST | `/portail/auth` | Login portail. |
| GET | `/portail/me` | Session portail. |
| GET | `/portail/evaluations` | Liste evaluations portail. |
| POST | `/portail/evaluations` | Creation evaluation. |
| DELETE | `/portail/evaluations/:evaluationId` | Suppression evaluation. |

### Rapports

| Methode | Endpoint | Role |
| --- | --- | --- |
| GET | `/rapports` | Rapports rediges. |
| POST | `/rapports/prefilled` | Creation rapport pre-rempli. |
| PATCH | `/rapports/:id/draft` | Mise a jour brouillon. |
| PATCH | `/rapports/:id/finalize` | Finalisation. |
| PATCH | `/rapports/:id/reopen` | Reouverture. |
| GET | `/rapports/evaluations` | Evaluations recues. |
| GET | `/rapports/documents` | Documents recus. |

---

## 6. Flux techniques

### 6.1 Flux creation dossier manuel

1. Le frontend envoie `POST /dossiers`.
2. La route Express appelle `createDossierController`.
3. Le service `createDossier` valide les donnees avec `DossierSchema`.
4. Les dates sont parsees et controlees.
5. Le dossier est cree dans PostgreSQL via Prisma.
6. Le dossier porte un `numeroDossier` unique.
7. Le service retourne le dossier avec beneficiaire/juridiction si disponible.

Limite actuelle : dans la creation manuelle, le service cree le dossier mais ne cree pas automatiquement le beneficiaire dans le meme flux. La creation automatique du beneficiaire est surtout presente dans le flux DAPG.

### 6.2 Flux synchronisation DAPG

1. L'utilisateur declenche `/dossiers/dapg/sync` ou `/dapg-import/sync-all`.
2. Le backend appelle l'API DAPG via `src/integrations/dapg/client.ts`.
3. Les donnees externes sont mappees vers le format interne par `dossier.mapper.ts`.
4. Prisma realise un `upsert` sur `Dossier.numeroDossier`.
5. Le service verifie ou cree le `Beneficiaire` associe.
6. Un QR code technique est genere pour le beneficiaire.
7. Les obligations specifiques DAPG sont synchronisees si disponibles.
8. Une notification peut etre creee pour signaler un nouveau beneficiaire.

### 6.3 Flux pointage biometrique / NFC

Endpoint public :

```text
POST /webhooks/pointages/biometrie
```

Payload attendu :

```json
{
  "nfc": "NFC-TEST-001",
  "timestamp": "2026-04-21T09:15:30Z",
  "centreNom": "Commissariat",
  "deviceId": "FAMOCO-001",
  "success": true
}
```

Etapes :

1. Le terminal externe envoie un JSON.
2. `BiometriePointageWebhookSchema` valide le payload.
3. Le service cherche un beneficiaire par `badgeNfc`.
4. Si aucun beneficiaire n'est trouve, le backend renvoie 404.
5. Le timestamp est parse.
6. Le pointage est cree avec `type=BIOMETRIE`, `source=FAMOCO`.
7. Si `success=true`, statut `VALIDE`.
8. Si `success=false`, statut `ANOMALIE` et notification `POINTAGE_ANOMALIE`.
9. Le pointage garde le payload externe en `externalPayload`.

### 6.4 Flux absence de pointage

1. Le job ou l'endpoint `/pointages/system/check-absences` lance la verification.
2. Le service lit les obligations de type `POINTAGE`.
3. Il calcule la periode attendue selon frequence : quotidienne, hebdomadaire, mensuelle, ponctuelle.
4. Si l'heure prevue est depassee et aucun pointage valide n'existe, un pointage `ABSENT` est cree.
5. Une `AlerteSurveillance` est creee.
6. Une notification `ABSENCE_POINTAGE` est creee.

### 6.5 Flux bracelet electronique MQTT

Topic principal :

```text
scbap/bracelets/telemetry
```

Etapes :

1. Le bracelet ou simulateur publie un JSON sur MQTT.
2. `startMqttSubscriber` recoit le message.
3. `handleMqttMessage` route vers `handleBraceletTelemetryMessage`.
4. Zod valide le payload avec `BraceletTelemetrySchema`.
5. Le backend cherche le bracelet par `device_id` ou `user_id`.
6. Il retrouve l'affectation active et le beneficiaire.
7. Une position est creee dans `positions_gps`.
8. Le bracelet est mis a jour : dernier signal, derniere position, statut connexion.
9. Les anomalies sont transformees en findings.
10. Les alertes et incidents sont crees.
11. Une notification est creee.
12. Un evenement WebSocket est diffuse.

Alertes detectees :

- sortie de zone ;
- retrait bracelet ;
- sabotage boitier ;
- batterie faible ;
- perte GPS ;
- perte GPRS ;
- coupure alimentation ;
- statut non standard.

### 6.6 Flux WebSocket surveillance

Endpoint :

```text
/ws/surveillance
```

Etapes :

1. Le frontend ouvre une connexion WebSocket.
2. Le backend extrait le token depuis cookie, query ou header selon implementation.
3. Le JWT est verifie.
4. Le backend charge l'utilisateur et son scope juridiction.
5. Le client est ajoute a la liste des clients connectes.
6. Un snapshot initial est envoye.
7. A chaque telemetrie ou alerte, le backend diffuse un message.
8. Les clients recoivent seulement les donnees de leur juridiction si scope applique.

Types de messages :

```json
{ "type": "snapshot", "payload": {} }
{ "type": "telemetry", "payload": {} }
{ "type": "alert", "payload": {} }
```

---

## 7. Systeme GPS et bracelet

### Nature actuelle

Le bracelet physique n'est pas encore integre. Le projet utilise une simulation logicielle.

Fichier :

```text
scbap-backend/src/scripts/simulate-bracelet.ts
```

### Simulation

La simulation :

- lit les bracelets en base via `codeImei` ;
- retrouve les beneficiaires affectes ;
- utilise la derniere position ou le centre d'une zone autorisee ;
- genere de petites variations GPS ;
- publie un payload MQTT a intervalle configurable ;
- simule plusieurs modes d'alerte.

Variables :

```env
BRACELET_SIMULATION_MODE=normal
BRACELET_SIMULATION_DEVICE_ID=BR-SEED-001
BRACELET_SIMULATION_DEVICE_IDS=BR-SEED-001,BR-SEED-002
BRACELET_SIMULATION_INTERVAL_MS=10000
```

Modes :

- `normal` ;
- `alert` ;
- `zone` ;
- `battery` ;
- `signal` ;
- `tamper` ;
- `strap`.

### Payload bracelet

Champs principaux :

- `device_id` ;
- `user_id` ;
- `timestamp` ;
- `heartbeat` ;
- `location.latitude` ;
- `location.longitude` ;
- `location.accuracy` ;
- `location.presence_flag` ;
- `location.rssi_dbm` ;
- `location.gps_fix` ;
- `location.zone_id` ;
- `location.zone_status` ;
- `health.battery_pct` ;
- `health.power_source` ;
- `health.gprs_signal` ;
- `health.gps_satellites` ;
- `alerts.strap_status` ;
- `alerts.geofence_breach` ;
- `alerts.gps_lost` ;
- `alerts.gprs_lost` ;
- `alerts.case_tamper` ;
- `alerts.power_loss` ;
- `status`.

### Limite actuelle

Le backend ne calcule pas encore tous les polygones GPS de maniere autonome. Il se base surtout sur les indicateurs envoyes par le bracelet : `zone_status` et `geofence_breach`.

---

## 8. Base de donnees

### Modeles principaux

| Modele | Role |
| --- | --- |
| `Structure` | Organisation ou entite de rattachement d'un utilisateur. |
| `Juridiction` | Territoire judiciaire. |
| `Role` | Role applicatif. |
| `User` | Utilisateur interne SCBAP. |
| `Dossier` | Fiche metier judiciaire. |
| `Beneficiaire` | Couche technique de suivi. |
| `Document` | Fichiers et pieces jointes. |
| `CategorieObligation` | Typologie des obligations. |
| `Obligation` | Obligation imposee au beneficiaire. |
| `Pointage` | Evenement de presence ou biometrie. |
| `Alerte` | Alerte metier historique. |
| `Notification` | Notification interface/email. |
| `Rapport` | Rapport redige ou pre-rempli. |
| `Bracelet` | Dispositif de surveillance. |
| `AffectationBracelet` | Association bracelet-beneficiaire. |
| `PositionGPS` | Telemetrie et positions GPS. |
| `Zone` | Zone autorisee/interdite. |
| `RegleSurveillance` | Regle liee a la surveillance. |
| `AlerteSurveillance` | Alerte temps reel/geolocalisee. |
| `IncidentBracelet` | Incident technique bracelet. |
| `HistoriqueAction` | Audit trail. |
| `HistoriqueStatut` | Historique de statut beneficiaire. |

### Relations importantes

- un `Dossier` peut avoir un `Beneficiaire` ;
- un `Beneficiaire` appartient a un `Dossier` ;
- un `Beneficiaire` possede plusieurs `Obligation` ;
- une `Obligation` appartient a une `CategorieObligation` ;
- un `Beneficiaire` possede plusieurs `Pointage` ;
- un `Beneficiaire` possede plusieurs `Document` ;
- un `Bracelet` possede plusieurs `AffectationBracelet` ;
- une `AffectationBracelet` relie un bracelet a un beneficiaire ;
- une `PositionGPS` appartient a un bracelet et a un beneficiaire ;
- une `AlerteSurveillance` peut pointer vers une position GPS ;
- une `Notification` peut etre liee a un beneficiaire, une alerte ou un pointage ;
- un `ServiceExterne` peut etre affecte a un beneficiaire ;
- une `EvaluationServiceExterne` appartient a une affectation de service.

### Donnees GPS

La table `positions_gps` stocke :

- latitude ;
- longitude ;
- precision ;
- presence RF ;
- RSSI ;
- zone externe ;
- zone status ;
- batterie ;
- source alimentation ;
- signal GPRS ;
- satellites GPS ;
- statut bracelet ;
- payload brut ;
- date/heure.

---

## 9. Securite

### Authentification interne

Le login utilise :

- email ;
- mot de passe ;
- bcrypt pour verification ;
- JWT pour session ;
- cookie d'authentification ;
- `sessionVersion` pour invalider les sessions.

### Autorisation

Le middleware `requireAuth` protege les routes internes.

Le middleware `requireRole` protege certains endpoints admin :

- gestion utilisateurs ;
- synchronisation NFC ;
- referentiel obligations specifiques.

Le filtrage par juridiction est applique dans certains services :

- dossiers ;
- beneficiaires ;
- biometrie ;
- dashboard/surveillance selon contexte.

### Validation

Zod valide les payloads entrants.

Exemples :

- login ;
- creation dossier ;
- webhook pointage ;
- telemetrie bracelet ;
- evaluation portail.

### Rate limiting

Le login possede une limitation en memoire :

- cle par IP + email ;
- nombre maximal de tentatives ;
- blocage temporaire.

### Portail externe

Le portail utilise un JWT separe :

- secret separe `PORTAIL_JWT_SECRET` ;
- middleware separe `requirePortalAuth` ;
- code d'acces hache en base.

### Audit

Le schema contient `HistoriqueAction` et `HistoriqueStatut`.

Limite : l'audit global existe dans le modele mais n'est pas encore systematiquement branche sur tous les workflows.

---

## 10. Temps reel

Le service temps reel est dans :

```text
src/services/surveillance-realtime.service.ts
```

Il maintient :

- un serveur WebSocket ;
- une liste de clients connectes ;
- un scope juridiction par client ;
- un snapshot de surveillance ;
- la diffusion de telemetries ;
- la diffusion d'alertes.

Le frontend consomme le WebSocket dans :

```text
src/pages/surveillance/GpsMapPage.tsx
src/pages/alertes/AlertesPage.tsx
```

La page surveillance :

- ouvre la connexion WebSocket ;
- recoit le snapshot initial ;
- met a jour les pistes GPS ;
- ajoute les evenements live ;
- affiche les zones ;
- filtre par risque ;
- permet de consulter les details.

---

## 11. Frontend

### Routes principales

Dans `scbap-frontend/src/App.tsx` :

```text
/login
/
/dashboard
/beneficiaires
/beneficiaires/:id
/pointages
/pointages/:id
/surveillance
/alertes
/notifications
/services
/services/:id
/rapports
/rapports/rediges
/rapports/evaluations
/rapports/documents
/configuration
/dossiers
/dossiers/:id
/administration
/portail
/portail/evaluation
/portail/evaluation/success
```

Routes admin :

- `/dossiers`
- `/dossiers/:id`
- `/administration`

### Pages importantes

| Page | Role |
| --- | --- |
| `DashboardPage` | Vue globale des indicateurs. |
| `BeneficiairesPage` | Liste, recherche, filtres. |
| `BeneficiaireDetailPage` | Profil, obligations, documents, biometrie, rapports. |
| `DossiersPage` | Dossiers judiciaires, export, synchro DAPG. |
| `PointagesPage` | Suivi des pointages. |
| `AlertesPage` | Alertes de surveillance. |
| `GpsMapPage` | Carte GPS temps reel. |
| `ServicesPage` | Services externes. |
| `ServiceDetailPage` | Affectations et codes d'acces. |
| `RapportsPage` | Navigation rapports. |
| `AdministrationPage` | Gestion utilisateurs. |
| `PortalLandingPage` | Accueil portail public. |
| `PortalEvaluationPage` | Saisie evaluation service externe. |

### Client API

Le frontend utilise un wrapper :

```text
src/lib/api.ts
```

Il s'appuie sur :

```env
VITE_API_URL=http://localhost:3000
```

### UX

L'interface contient :

- layout lateral ;
- badges de statut ;
- filtres ;
- pagination compacte ;
- tiroirs lateraux ;
- notifications toast ;
- carte de surveillance ;
- etats de chargement/erreur.

---

## 12. Jobs et automatisations

Jobs principaux :

```text
src/jobs/biometrie.scheduler.ts
src/jobs/absence-check.job.ts
src/jobs/monthly-rapport.job.ts
src/jobs/surveillance-health.job.ts
```

Roles :

- verifier les enrolements biometriques en attente ;
- detecter les absences de pointage ;
- generer ou preparer les rapports mensuels ;
- detecter les bracelets hors ligne.

Le job `surveillance-health` verifie le dernier signal des bracelets et peut creer une alerte si aucun signal n'est recu depuis un delai donne.

---

## 13. Choix techniques et justifications

### Node.js / Express

Choisi pour :

- rapidite de developpement ;
- ecosysteme riche ;
- simplicite REST ;
- integration facile WebSocket/MQTT.

### TypeScript

Choisi pour :

- typage des contrats ;
- lisibilite ;
- reduction des erreurs ;
- meilleure maintenabilite.

### Prisma

Choisi pour :

- modelisation claire ;
- migrations ;
- typage du client ;
- relations explicites ;
- productivite avec PostgreSQL.

### PostgreSQL

Choisi pour :

- robustesse relationnelle ;
- support JSON ;
- index ;
- coherence des donnees ;
- possibilite future PostGIS/TimescaleDB.

### Zod

Choisi pour :

- validation stricte des payloads ;
- schemas proches du code ;
- erreurs exploitables.

### React / Vite

Choisi pour :

- rapidite de developpement ;
- composants reutilisables ;
- routage fluide ;
- build rapide.

### WebSocket

Choisi pour :

- temps reel ;
- telemetrie bracelet ;
- alertes live ;
- carte de surveillance dynamique.

### MQTT

Choisi pour :

- communication IoT ;
- faible overhead ;
- QoS ;
- compatibilite GPRS ;
- adaptation au bracelet electronique.

### MinIO

Choisi pour :

- stockage objet compatible S3 ;
- execution locale facile ;
- URLs signees ;
- separation fichiers/base relationnelle.

---

## 14. Problemes techniques rencontres ou points sensibles

### Relations Prisma

Le modele contient de nombreuses relations :

- dossier-beneficiaire ;
- beneficiaire-obligations ;
- beneficiaire-bracelet ;
- beneficiaire-documents ;
- beneficiaire-services externes.

Cela demande des `include` precis et une attention aux suppressions logiques.

### Fuseau horaire

Le projet manipule les dates de pointage et d'obligation avec `APP_TIME_ZONE`.

Point sensible :

- calculer une absence selon le jour local ;
- eviter les decalages UTC ;
- stocker proprement les timestamps.

### Temps reel

Le WebSocket doit :

- authentifier les clients ;
- filtrer par juridiction ;
- envoyer un snapshot initial ;
- diffuser les evenements sans dupliquer.

### Bracelet simule

La telemetrie est simulee.

Le vrai defi sera :

- broker public ;
- GPRS ;
- QoS ;
- buffer offline ;
- device_id stable ;
- synchronisation GPS/RTC.

### Donnees externes

DAPG et biometrie dependent d'APIs externes.

Points sensibles :

- disponibilite reseau ;
- format changeant ;
- tokens ;
- timeouts ;
- mapping des donnees.

### Documents

Le stockage MinIO implique :

- gestion bucket ;
- object keys ;
- upload binaire ;
- type MIME ;
- suppression de fichier.

---

## 15. Limites actuelles

- Le bracelet physique n'est pas encore branche en production.
- Le broker MQTT final n'est pas encore defini.
- Les topics MQTT `events`, `status`, `config` existent mais ne sont pas encore fonctionnels.
- Le geofencing est surtout base sur les indicateurs envoyes par le bracelet.
- L'audit trail existe dans le schema mais n'est pas branche partout.
- Le rate limit login est en memoire, donc non partage entre plusieurs instances.
- Les secrets sont geres par `.env` local ; il faudra une strategie de secrets en production.
- Les roles sont simples ; il n'y a pas encore de matrice de permissions fine.
- Le calcul GPS avance pourrait beneficier de PostGIS.

---

## 16. Perspectives

Perspectives techniques :

- broker MQTT public securise avec TLS ;
- integration du vrai bracelet ;
- interface d'enregistrement et d'affectation des bracelets ;
- geofencing backend avec PostGIS ;
- historique complet des evenements bracelet ;
- tableau d'audit systematique ;
- application mobile agent ;
- notifications SMS/email ;
- analytics de risque ;
- alertes intelligentes ;
- supervision de disponibilite du broker MQTT ;
- tableau de monitoring IoT ;
- chiffrement bout-en-bout ou signature des payloads bracelet.

---

## 17. Synthese pour le chapitre 2

SCBAP repose sur une architecture web client-serveur moderne.

Le backend Express centralise la logique metier, les integrations externes, la securite, les jobs, le stockage documentaire et les flux temps reel. Prisma assure la modelisation relationnelle et l'acces PostgreSQL. Le frontend React/Vite fournit les ecrans de supervision et consomme l'API REST ainsi que le WebSocket de surveillance.

La partie la plus distinctive du projet est la surveillance electronique. Elle combine MQTT, validation de payload IoT, stockage GPS, detection d'alertes, notifications et diffusion WebSocket vers une carte temps reel. Meme si le bracelet physique n'est pas encore deployee, le simulateur reproduit le contrat attendu et prepare l'integration terrain.

