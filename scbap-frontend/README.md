# SCBAP Frontend

Interface web React/Vite de SCBAP, la plateforme de suivi des beneficiaires sous mesure judiciaire.

Elle couvre les ecrans principaux de l'application :

- tableau de bord ;
- authentification ;
- dossiers et beneficiaires ;
- obligations et pointages ;
- alertes et notifications ;
- services externes ;
- rapports ;
- surveillance GPS des bracelets electroniques ;
- portail public d'evaluation des services partenaires.

---

## Prerequis

- Node.js 20 ou plus recent
- npm
- backend SCBAP lance sur `http://localhost:3000`

---

## Installation

Depuis le dossier frontend :

```bash
cd scbap-frontend
npm install
```

---

## Configuration

Le fichier local `.env.development` doit contenir au minimum :

```env
VITE_API_URL=http://localhost:3000
VITE_APP_TIME_ZONE=Africa/Porto-Novo
```

Pour créer le fichier local :

```bash
cp .env.example .env
```

Pour la production, copiez :

```bash
cp .env.production.example .env.production
```

Variable optionnelle pour forcer l'URL WebSocket de surveillance :

```env
VITE_SURVEILLANCE_WS_URL=ws://localhost:3000/ws/surveillance
```

Si `VITE_SURVEILLANCE_WS_URL` n'est pas definie, l'application construit automatiquement l'URL WebSocket depuis l'hote courant.

---

## Lancement en developpement

```bash
npm run dev
```

Vite demarre generalement sur :

```text
http://localhost:5173
```

---

## Commandes utiles

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

| Commande | Role |
| --- | --- |
| `npm run dev` | Lance le serveur Vite en developpement. |
| `npm run build` | Compile TypeScript puis genere le build de production. |
| `npm run lint` | Lance ESLint sur le frontend. |
| `npm run preview` | Sert localement le build genere. |

---

## Structure rapide

```text
src/
├─ App.tsx
├─ main.tsx
├─ auth/
├─ components/
├─ context/
├─ hooks/
├─ lib/
├─ pages/
├─ types/
└─ utils/
```

Reperes importants :

- `src/lib/api.ts` : client API base sur `VITE_API_URL`.
- `src/auth/` : contexte et stockage d'authentification.
- `src/pages/surveillance/GpsMapPage.tsx` : carte GPS temps reel.
- `src/pages/alertes/AlertesPage.tsx` : alertes de surveillance.
- `src/pages/portal/` : portail public pour les services externes.
- `src/components/layout/AppLayout.tsx` : navigation principale.

---

## Flux bracelet electronique

Le frontend ne se connecte pas directement au broker MQTT.

Le flux est :

```text
Bracelet ou simulateur MQTT
        -> backend SCBAP
        -> WebSocket /ws/surveillance
        -> pages Surveillance GPS et Alertes
```

La documentation technique du contrat MQTT est disponible ici :

```text
../docs/bracelet-electronique-mqtt.md
```

---

## Verification rapide

1. Lancer le backend sur `http://localhost:3000`.
2. Lancer le frontend avec `npm run dev`.
3. Se connecter a l'application.
4. Ouvrir le dashboard, les dossiers, les alertes et la page Surveillance GPS.
5. Pour tester la surveillance, lancer le simulateur bracelet cote backend.

