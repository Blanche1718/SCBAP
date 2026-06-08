# Deploiement Docker SCBAP - Serveurs Justice

Ce guide deploie SCBAP sur un serveur de la Justice avec Docker Compose.

## 1. Prerequis serveur

- Docker installe.
- Docker Compose installe.
- Acces reseau depuis le serveur vers les APIs Justice :
  - DAPG : `https://pprod-amenagementdepeine.justice.bj/api`
  - Biometrie, si utilisee.
  - NFC, si utilisee.
- Port applicatif ouvert vers les utilisateurs, par defaut `8080`.

## 2. Preparer les variables

Modifier `.env` et remplacer toutes les valeurs `CHANGE_ME...`.

Generer des secrets forts :

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Utiliser ces valeurs pour :

```env
JWT_SECRET=
PORTAIL_JWT_SECRET=
WEBHOOK_SECRET=
```

Si l'application est servie en HTTP intranet :

```env
PUBLIC_APP_URL=http://ADRESSE_DU_SERVEUR:8080
HTTPS=false
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
```

Si l'application est servie en HTTPS :

```env
PUBLIC_APP_URL=https://DOMAINE_JUSTICE
HTTPS=true
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
```

## 3. Construire et demarrer

```bash
docker compose -f docker-compose.justice.yml --env-file .env up -d --build
```

Voir les logs :

```bash
docker compose -f docker-compose.justice.yml --env-file .env logs -f backend
```

Verifier les conteneurs :

```bash
docker compose -f docker-compose.justice.yml --env-file .env ps
```

## 4. Acceder a l'application

Frontend :

```txt
http://ADRESSE_DU_SERVEUR:8080
```

Health frontend :

```txt
http://ADRESSE_DU_SERVEUR:8080/health
```

Health backend via proxy :

```txt
http://ADRESSE_DU_SERVEUR:8080/api/health
```

Console MinIO :

```txt
http://ADRESSE_DU_SERVEUR:9001
```

## 5. Migrations Prisma

Le conteneur backend applique automatiquement :

```bash
npx prisma migrate deploy
```

au demarrage.

## 6. Tester DAPG depuis le serveur

Une fois connecte a l'application, tester le diagnostic DAPG :

```txt
http://ADRESSE_DU_SERVEUR:8080/api/dossiers/dapg/diagnostics
```

Si DAPG repond depuis les serveurs Justice, la synchronisation des dossiers devrait fonctionner.

## 7. Endpoint Famoco

Famoco doit appeler :

```txt
POST http://ADRESSE_DU_SERVEUR:8080/api/webhooks/pointages/biometrie
```

La documentation HMAC est ici :

```txt
docs/FAMOCO-POINTAGES-HMAC.md
```

Dans cette documentation, remplacer l'URL Render par l'URL Justice :

```txt
http://ADRESSE_DU_SERVEUR:8080/api/webhooks/pointages/biometrie
```

## 8. Commandes utiles

Arreter :

```bash
docker compose -f docker-compose.justice.yml --env-file .env down
```

Redemarrer :

```bash
docker compose -f docker-compose.justice.yml --env-file .env restart
```

Rebuild apres modification du code :

```bash
docker compose -f docker-compose.justice.yml --env-file .env up -d --build
```

Sauvegarder PostgreSQL :

```bash
docker compose -f docker-compose.justice.yml --env-file .env exec postgres pg_dump -U scbap scbap > backup-scbap.sql
```

## 9. Ports utilises

- `8080` : application SCBAP.
- `9001` : console MinIO.
- PostgreSQL, Redis, MinIO API et backend ne sont pas exposes publiquement par defaut.

## 10. Points de vigilance

- Ne pas utiliser les secrets `CHANGE_ME...`.
- Garder `.env` hors Git.
- Verifier que `PUBLIC_APP_URL` correspond exactement a l'URL ouverte par les utilisateurs.
- Si HTTPS est ajoute via reverse proxy externe, mettre `HTTPS=true` et `AUTH_COOKIE_SECURE=true`.
- Si MQTT n'est pas encore configure, laisser `MQTT_BROKER_URL` vide.
