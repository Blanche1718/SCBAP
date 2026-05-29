# 🚀 GUIDE DE DÉPLOIEMENT - SCBAP

**Date**: 29 mai 2026  
**Version**: 1.0  
**Statut**: Guide pré-production

## Table des matières
1. [Prérequis](#prérequis)
2. [Préparation](#préparation)
3. [Déploiement Local](#déploiement-local)
4. [Déploiement Production](#déploiement-production)
5. [Post-Déploiement](#post-déploiement)
6. [Dépannage](#dépannage)

---

## Prérequis

### Environnement
- **Node.js**: 20.x LTS minimum
- **npm**: 10.x minimum
- **PostgreSQL**: 14.x minimum
- **Redis**: 7.x minimum (pour rate limiting)
- **Docker & Docker Compose**: Pour containerisation (recommandé)

### Accès Requis
- Accès SSH au serveur de déploiement
- Credentials MinIO ou S3 pour stockage
- Credentials SMTP pour emails
- Credentials API externes (Biométrie, NFC, MQTT broker)

---

## Préparation

### 1. Cloner le repository et installer les dépendances

```bash
# Backend
cd scbap-backend
npm install

# Frontend
cd ../scbap-frontend
npm install
```

### 2. Configurer les variables d'environnement

#### Backend
```bash
cd scbap-backend

# Copier le fichier d'exemple pour le développement local
cp .env.development.example .env.development

# Pour la production, copier l'exemple de production
# cp .env.production.example .env.production

# Éditer et configurer les variables
nano .env.development
```

**Variables CRITIQUES à personnaliser:**
```env
# Database
DATABASE_URL=postgresql://user:strong_password@localhost:5432/scbap_prod

# Sécurité
JWT_SECRET=<generate_strong_32char_random_string>
PORTAIL_JWT_SECRET=<generate_different_32char_random_string>
WEBHOOK_SECRET=<generate_32char_random_string>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# MinIO
MINIO_ACCESS_KEY=<strong_access_key>
MINIO_SECRET_KEY=<strong_secret_key>

# SMTP
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
MAIL_FROM_EMAIL=your-email@domain.com
MAIL_FROM_NAME=SCBAP

# APIs Externes
BIOMETRIE_API_KEY=<your_biometrie_key>
MQTT_USERNAME=<your_mqtt_user>
MQTT_PASSWORD=<your_mqtt_password>

# Redis (pour rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# Production
NODE_ENV=production
AUTH_COOKIE_SECURE=true
HTTPS=true
```

#### Frontend
```bash
cd ../scbap-frontend

# Copier le fichier d'exemple pour le développement local
cp .env.development.example .env.development

# Pour la production, copier l'exemple de production
# cp .env.production.example .env.production

# Éditer et configurer
nano .env.development
```

**Configuration à personnaliser:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_SURVEILLANCE_WS_URL=wss://api.yourdomain.com
```

### 3. Générer des secrets forts

```bash
# Générer JWT_SECRET (32+ caractères aléatoires)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Faire la même chose 2 fois supplémentaires pour:
# - PORTAIL_JWT_SECRET
# - WEBHOOK_SECRET
```

---

## Déploiement Local

### 1. Démarrer les services de base

```bash
# Depuis le répertoire racine du projet
docker-compose -f scbap-backend/docker-compose.minio.yml up -d

# Vérifier MinIO
curl http://localhost:9002/minio/health/live

# Vérifier PostgreSQL
psql postgresql://postgres:password@localhost:5432/postgres -c "SELECT 1"
```

### 2. Initialiser la base de données

```bash
cd scbap-backend

# Créer la migration initiale
npm run prisma:migrate:dev -- --name init

# Ou appliquer les migrations existantes
npm run prisma:migrate:deploy

# Vérifier avec Prisma Studio (optionnel)
npm run prisma:studio
```

### 3. Remplir les données de base

```bash
# Exécuter les seed scripts
npm run seed:juridictions
npm run seed:categories
npm run seed:users
npm run seed:admin
```

### 4. Démarrer le backend

```bash
cd scbap-backend

# Développement
npm run dev

# Production (build puis run)
npm run build
npm run start
```

### 5. Démarrer le frontend

```bash
cd scbap-frontend

# Développement
npm run dev

# Production (build puis test)
npm run build
npm run preview
```

### 6. Vérifier l'accès

```bash
# Tester l'API
curl http://localhost:3000/health

# Accéder à l'application
# http://localhost:5173 (dev)
# http://localhost:4173 (prod preview)
```

---

## Déploiement Production

### Arch recommandée:
```
┌─────────────────────────────────────────────────┐
│           Nginx Reverse Proxy (HTTPS)           │
│                                                 │
│  ┌─────────────────┐      ┌──────────────────┐ │
│  │  Frontend Build │      │  Backend Express │ │
│  │  (Static Files) │      │   (Node.js)      │ │
│  └─────────────────┘      └──────────────────┘ │
│         :8080                     :3000         │
└─────────────────────────────────────────────────┘
         ↓              ↓              ↓
   [PostgreSQL]    [Redis]       [MinIO]
   Port: 5432      Port: 6379    Port: 9000
```

### 1. Créer Dockerfile pour Backend

Créer `scbap-backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Installer dépendances système
RUN apk add --no-cache python3 make g++

# Copier package files
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src ./src
COPY tsconfig.json .

# Builder TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Démarrer l'application
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Créer Dockerfile pour Frontend

Créer `scbap-frontend/Dockerfile`:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Créer nginx.conf pour Frontend

Créer `scbap-frontend/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;

    server {
        listen 80;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        # Cache pour assets
        location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # SPA routing - tous les autres fichiers → index.html
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 4. Créer docker-compose.yml Production

Créer `docker-compose.prod.yml`:

```yaml
version: '3.9'

services:
  postgresql:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: scbap_prod
      POSTGRES_USER: scbap_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgresql_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scbap_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  backend:
    build: ./scbap-backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      PORTAIL_JWT_SECRET: ${PORTAIL_JWT_SECRET}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      NODE_ENV: production
      AUTH_COOKIE_SECURE: "true"
      HTTPS: "true"
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./scbap-frontend
    environment:
      VITE_API_URL: ${VITE_API_URL}
      VITE_SURVEILLANCE_WS_URL: ${VITE_SURVEILLANCE_WS_URL}
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgresql_data:
  redis_data:
  minio_data:
```

### 5. Configurer les variables d'environnement pour production

Créer `.env.prod`:

```bash
# Database
DATABASE_URL=postgresql://scbap_user:${DB_PASSWORD}@postgresql:5432/scbap_prod

# Secrets (À générer !)
JWT_SECRET=${GENERATE_RANDOM_32_CHARS}
PORTAIL_JWT_SECRET=${GENERATE_RANDOM_32_CHARS}
WEBHOOK_SECRET=${GENERATE_RANDOM_32_CHARS}

# MinIO
MINIO_ROOT_USER=scbap_prod_user
MINIO_ROOT_PASSWORD=${GENERATE_STRONG_PASSWORD}

# Redis
REDIS_PASSWORD=${GENERATE_STRONG_PASSWORD}

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_SURVEILLANCE_WS_URL=wss://api.yourdomain.com

# Backend
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 6. Déployer avec Docker Compose

```bash
# Depuis le répertoire racine
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Vérifier les services
docker-compose -f docker-compose.prod.yml ps

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

## Post-Déploiement

### 1. Vérifier la santé des services

```bash
# Vérifier chaque service
curl https://api.yourdomain.com/health
curl https://yourdomain.com/health

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
docker-compose -f docker-compose.prod.yml logs --tail=100 frontend
```

### 2. Tester les fonctionnalités clés

```bash
# Login
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@scbap.bj","password":"admin_password"}'

# Récupérer les utilisateurs
curl -H "Authorization: Bearer <token>" \
  https://api.yourdomain.com/users

# Tester WebSocket
wscat -c wss://api.yourdomain.com/ws/surveillance
```

### 3. Configurer les backups

```bash
# Backup PostgreSQL quotidien
0 2 * * * pg_dump postgresql://user:password@host:5432/scbap_prod | gzip > /backups/scbap_$(date +\%Y\%m\%d).sql.gz

# Backup MinIO quotidien
0 3 * * * mc mirror --watch minio/scbap-documents /backups/minio/
```

### 4. Configurer le monitoring

- Installer Prometheus + Grafana
- Installer ELK Stack ou Sentry
- Configurer alertes pour:
  - CPU/Mémoire
  - Erreurs applicatives
  - Temps de réponse API
  - Disponibilité services

---

## Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs backend

# Erreurs courantes:
# - DATABASE_URL invalide
# - JWT_SECRET trop court
# - Port 3000 déjà utilisé
```

### Le frontend ne charge pas

```bash
# Vérifier nginx
docker-compose -f docker-compose.prod.yml logs frontend

# Vérifier la configuration nginx
docker exec <frontend_container_id> nginx -t
```

### Erreur de connexion à la base de données

```bash
# Vérifier PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgresql psql -U scbap_user -c "\l"

# Réinitialiser les migrations
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate:reset -- --skip-generate
```

### WebSocket ne fonctionne pas

```bash
# Vérifier que wss:// est configuré correctement en production
# Ajouter les headers WebSocket dans nginx:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Erreurs CORS en frontend

```bash
# Vérifier ALLOWED_ORIGINS dans .env backend
# Doit inclure le domaine du frontend

# Ajouter du debug:
VITE_DEBUG=true npm run build
```

---

**Besoin d'aide ?**  
Voir [TROUBLESHOOTING.md](TROUBLESHOOTING.md) ou contacter l'équipe DevOps.
