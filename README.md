# SCBAP

SCBAP est une plateforme de suivi et de supervision de personnes sous mesure judiciaire au Benin.

Le depot contient deux applications :

- `scbap-backend` : API Node.js / Express / Prisma / PostgreSQL ;
- `scbap-frontend` : interface web React / Vite.

Le projet couvre deja les principaux flux metiers : authentification, dossiers, beneficiaires, obligations, pointages, biometrie, documents, services externes, rapports, alertes et fondations de surveillance electronique par bracelet.

---

## Architecture

```text
scbap/
├─ scbap-backend/     API, Prisma, integrations, jobs, scripts
├─ scbap-frontend/    application web React/Vite
└─ docs/              documentation fonctionnelle et technique
```

### Backend

Le backend suit une organisation simple :

- `src/routes` : routes HTTP ;
- `src/controllers` : entree/sortie HTTP ;
- `src/services` : logique metier ;
- `src/schemas` : validation Zod ;
- `src/integrations` : clients externes ;
- `src/jobs` : taches planifiees ;
- `src/scripts` : seeds, backfills et simulations ;
- `prisma` : schema et migrations.

### Frontend

Le frontend est organise autour de :

- `src/pages` : ecrans applicatifs ;
- `src/components` : composants reutilisables ;
- `src/auth` : contexte et stockage d'authentification ;
- `src/hooks` : chargement de donnees ;
- `src/lib` : client API ;
- `src/types` et `src/utils` : types et helpers.

---

## Modules Principaux

- **Dashboard** : indicateurs globaux et filtrage par juridiction.
- **Dossiers** : import/synchronisation DAPG, consultation, edition, export.
- **Beneficiaires** : profil technique lie au dossier, statut, biometrie, NFC, QR code.
- **Obligations** : obligations importees ou saisies manuellement.
- **Pointages** : pointage manuel, NFC, biometrie et historique.
- **Biometrie** : lancement d'enrolement et suivi via API justice.
- **Documents** : stockage des fichiers via MinIO.
- **Services externes** : portail public et evaluations partenaires.
- **Rapports** : generation et suivi des rapports.
- **Surveillance electronique** : reception MQTT, positions GPS, alertes, incidents et carte temps reel.

---

## Technologies

| Couche | Technologies |
| --- | --- |
| Backend | Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4 |
| Stockage | MinIO |
| Temps reel | WebSocket |
| Bracelet | MQTT |
| Integrations | DAPG, API biometrie justice, NFC/Famoco |

---

## Prerequis

- Node.js 20 ou plus recent ;
- npm ;
- PostgreSQL 14+ ;
- Docker si MinIO est lance localement ;
- Mosquitto ou un autre broker MQTT pour tester le bracelet ;
- les cles d'acces aux APIs externes si les integrations reelles sont utilisees.

---

## Installation Locale

### 1. Installer les dependances

```bash
cd scbap-backend
npm install

cd ../scbap-frontend
npm install
```

### 2. Preparer PostgreSQL

Creer une base `scbap`, puis renseigner `DATABASE_URL` dans `scbap-backend/.env`.

Exemple :

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/scbap"
```

### 3. Demarrer MinIO

```bash
cd scbap-backend
docker compose -f docker-compose.minio.yml up -d
```

### 4. Configurer les fichiers `.env`

Backend : `scbap-backend/.env`

Variables vraiment importantes :

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/scbap"
JWT_SECRET=change-me
PORTAIL_JWT_SECRET=change-me-too

DAPG_BASE_URL=https://pprod-amenagementdepeine.justice.bj/api
DAPG_API_KEY=

BIOMETRIE_API_BASE_URL=http://pprod-fingerprints.justice.bj
BIOMETRIE_API_KEY=

MINIO_ENDPOINT=http://localhost:9002
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=scbap-documents

MQTT_BROKER_URL=mqtt://localhost:1883
```

Frontend : `scbap-frontend/.env`

```env
VITE_API_URL=http://localhost:3000
VITE_APP_TIME_ZONE=Africa/Porto-Novo
```

Pour le detail complet du frontend, voir [scbap-frontend/README.md](scbap-frontend/README.md).

### 5. Appliquer Prisma

Depuis `scbap-backend` :

```bash
npx prisma generate
npx prisma migrate deploy --config prisma.config.ts
```

### 6. Charger des donnees de test

Depuis `scbap-backend` :

```bash
npm run seed:categories-obligations
npm run seed:juridictions
npm run seed:admin
npm run seed:users-juridiction
npm run seed:dossiers
npm run seed:pointages
npm run seed:alertes
```

Pour la surveillance electronique :

```bash
npm run seed:bracelets
npm run seed:zones
```

### 7. Lancer les applications

Backend :

```bash
cd scbap-backend
npm run dev
```

Frontend :

```bash
cd scbap-frontend
npm run dev
```

URLs locales :

- backend : `http://localhost:3000`
- frontend : `http://localhost:5173`
- portail public : `http://localhost:5173/portail`

---

## Commandes Utiles

### Backend

```bash
npm run dev
npm run build
npm run start
```

Seeds et scripts courants :

```bash
npm run seed:admin
npm run seed:dossiers
npm run seed:pointages
npm run seed:alertes
npm run seed:bracelets
npm run seed:zones
npm run backfill:beneficiaire-statuts
```

Simulation bracelet :

```bash
npm run simulate:bracelet
npm run simulate:bracelet:zone
npm run simulate:bracelet:battery
npm run simulate:bracelet:signal
npm run simulate:bracelet:tamper
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

---

## Bracelet Electronique

Le bracelet physique ne communique pas directement avec le frontend.

Flux attendu :

```text
Bracelet ou simulateur
        -> broker MQTT
        -> backend SCBAP
        -> PostgreSQL + alertes
        -> WebSocket
        -> interface web
```

Topic MQTT principal :

```text
scbap/bracelets/telemetry
```

Le guide complet a transmettre au fabricant est ici :

- [docs/bracelet-electronique-mqtt.md](docs/bracelet-electronique-mqtt.md)

---

## Integrations Externes

| Integration | Usage |
| --- | --- |
| DAPG | Import et synchronisation des dossiers. |
| API biometrie justice | Enrolement et suivi biometrie. |
| NFC/Famoco | Recherche ou pointage via identifiant NFC. |
| MinIO | Stockage documentaire. |
| MQTT | Reception des donnees bracelet. |

Les integrations peuvent etre utilisees en mode reel si les cles sont disponibles, ou simulees avec les seeds/scripts pour les demonstrations locales.

---

## Verification Rapide

1. Lancer PostgreSQL et MinIO.
2. Lancer le backend avec `npm run dev`.
3. Lancer le frontend avec `npm run dev`.
4. Se connecter avec un utilisateur seed.
5. Verifier le dashboard, les dossiers, les beneficiaires et les pointages.
6. Lancer `npm run seed:bracelets` puis `npm run simulate:bracelet`.
7. Ouvrir la page Surveillance GPS et verifier la remontee temps reel.

---

## Depannage Court

| Probleme | Verification |
| --- | --- |
| Le backend ne demarre pas | Verifier `DATABASE_URL`, PostgreSQL et `JWT_SECRET`. |
| Prisma echoue | Relancer `npx prisma generate`, puis verifier les migrations. |
| Le frontend ne voit pas l'API | Verifier `VITE_API_URL` et que le backend ecoute sur le bon port. |
| Les documents ne s'ouvrent pas | Verifier MinIO, le bucket et les variables `MINIO_*`. |
| Les positions bracelet n'arrivent pas | Verifier le broker MQTT, `MQTT_BROKER_URL`, le topic et le `device_id`. |
| Les alertes ne s'affichent pas en temps reel | Verifier `/ws/surveillance` et la page Alertes/Surveillance. |

---

## Documentation

- [README frontend](scbap-frontend/README.md)
- [Contrat MQTT bracelet](docs/bracelet-electronique-mqtt.md)
- [Cahier des charges](docs/cahier-des-charges-scbap.md)

---

## Etat Du Projet

Le socle backend/frontend est operationnel pour une demonstration locale : gestion metier, documents, biometrie, pointages, portail public, rapports et surveillance electronique simulee.

La prochaine etape importante cote bracelet est de remplacer le simulateur MQTT par un prototype physique qui publie le meme payload sur le meme topic.

