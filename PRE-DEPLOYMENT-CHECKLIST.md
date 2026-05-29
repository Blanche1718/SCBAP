# ✅ CHECKLIST PRÉ-DÉPLOIEMENT - ACTIONS IMMÉDIATES

**Priorité**: 🔴 **CRITIQUE** - À compléter AVANT tout déploiement  
**Estimé**: 2-4 heures  
**Date limite**: Avant déploiement production

---

## Phase 1: Sécurité (IMMÉDIATE - 1 heure)

### 1.1 Corriger la vulnérabilité CORS
- [ ] Aller à `scbap-backend/src/index.ts` ligne 37
- [ ] Remplacer `cors({ origin: true, ... })` par configuration avec whitelist
- [ ] Tester localement: `curl -H "Origin: http://malicious.com" ...`

**Code à appliquer:**
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
```

### 1.2 Générer les secrets forts
- [ ] Générer JWT_SECRET (32+ chars):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Générer PORTAIL_JWT_SECRET
- [ ] Générer WEBHOOK_SECRET
- [ ] Générer MINIO credentials forts
- [ ] Générer DB password fort

**Stockez ces secrets dans un gestionnaire (1Password, Vault, etc.)**

### 1.3 Créer .env.production sécurisé
- [ ] Copier `scbap-backend/.env.production.example` → `scbap-backend/.env.production`
- [ ] Remplir TOUS les secrets générés
- [ ] Définir NODE_ENV=production
- [ ] Définir AUTH_COOKIE_SECURE=true
- [ ] Définir HTTPS=true
- [ ] Définir ALLOWED_ORIGINS avec vrai domaine
- [ ] ⚠️ NE JAMAIS commiter `scbap-backend/.env.production`

### 1.4 Sécuriser les uploads
- [ ] Vérifier que MinIO a des credentials forts
- [ ] Créer bucket separate pour production
- [ ] Configurer bucket policies en private

---

## Phase 2: Configuration (30 minutes)

### 2.1 Frontend .env
- [ ] Copier `scbap-frontend/.env.production.example` → `scbap-frontend/.env.production`
```env
VITE_API_URL=https://api.yourdomain.com
VITE_SURVEILLANCE_WS_URL=wss://api.yourdomain.com
VITE_APP_TIME_ZONE=UTC
```

### 2.2 Variables de base de données
- [ ] DATABASE_URL correct pour production
- [ ] Tester la connexion: `psql "$DATABASE_URL" -c "SELECT 1"`
- [ ] Vérifier que la DB existe

### 2.3 SMTP Configuration
- [ ] SMTP_HOST configuré (ex: smtp.gmail.com)
- [ ] SMTP_USER = adresse email
- [ ] SMTP_PASS = app password (pas le mot de passe Gmail)
- [ ] MAIL_FROM_EMAIL défini
- [ ] Tester: `npm run test:smtp` (si script existe)

### 2.4 APIs Externes
- [ ] BIOMETRIE_API_KEY obtenu
- [ ] MQTT credentials configurés
- [ ] NFC endpoint accessible
- [ ] Tester chaque connexion

---

## Phase 3: Validation (45 minutes)

### 3.1 Build et Tests
- [ ] Backend build sans erreurs: `npm run build`
- [ ] Frontend build sans erreurs: `npm run build`
- [ ] Aucune erreur TypeScript critique
- [ ] ESLint warnings revus

### 3.2 Migrations Database
- [ ] Toutes les migrations appliquées: `npm run prisma:migrate:status`
- [ ] Seed scripts exécutés pour données de base
- [ ] Admin user créé avec password fort

### 3.3 Vérifier les fichiers critiques
- [ ] ✅ `.env.example` a DATABASE_URL
- [ ] ✅ `scbap-frontend/.env.example` créé
- [ ] ✅ Dockerfile backend existe (si containerisation)
- [ ] ✅ Dockerfile frontend existe (si containerisation)
- [ ] ✅ docker-compose.prod.yml existe

### 3.4 Tests de sécurité rapides
- [ ] Pas de secrets commités: `git grep "password\|secret\|key" src/`
- [ ] Pas de console.log sensibles: `git grep "JWT_SECRET\|password" src/`
- [ ] CORS test: Requête depuis autre domaine = rejetée
- [ ] Auth test: Token expiré = 401

---

## Phase 4: Infrastructure (1 heure)

### 4.1 Serveur Préparation
- [ ] Ubuntu 22.04 LTS ou similaire
- [ ] Node.js 20.x installé: `node --version`
- [ ] npm 10.x installé: `npm --version`
- [ ] PostgreSQL 14.x installé
- [ ] Redis 7.x installé (optionnel mais recommandé)
- [ ] Docker & Docker Compose (si utilisé)

### 4.2 SSL/TLS
- [ ] Certificate SSL obtenu (Let's Encrypt gratuit recommandé)
- [ ] Certificate stocké: `/etc/ssl/certs/yourdomain.com.crt`
- [ ] Private key stocké: `/etc/ssl/private/yourdomain.com.key`
- [ ] Vérifier: `openssl x509 -in /etc/ssl/certs/yourdomain.com.crt -text`

### 4.3 Firewall
- [ ] Port 22 (SSH) ouvert pour admin
- [ ] Port 80 (HTTP) → redirect 443
- [ ] Port 443 (HTTPS) ouvert pour users
- [ ] Port 3000 accessible SEULEMENT depuis nginx (pas public)
- [ ] Port 5432 (DB) not exposed (internal only)

### 4.4 Domain & DNS
- [ ] Domain pointé vers IP du serveur
- [ ] DNS propagé: `nslookup yourdomain.com`
- [ ] SSL certificate valide pour le domain

---

## Phase 5: Documentation (20 minutes)

### 5.1 Documenter la setup
- [ ] Créer `DEPLOYMENT_NOTES.md` avec:
  - Serveur IP/hostname
  - Contacts d'urgence
  - Procédure de rollback
  - Contacts support

### 5.2 Backup plan
- [ ] Procédure de backup documentée
- [ ] Cronjobs de backup configurés
- [ ] Test de restauration effectué une fois

### 5.3 Monitoring plan
- [ ] Prometheus/Grafana configuré (ou autre)
- [ ] Alertes configurées pour:
  - ❌ Service down
  - ❌ CPU > 80%
  - ❌ Memory > 85%
  - ❌ Disk space < 10%
  - ❌ Error rate spike

---

## Phase 6: Final Checks (15 minutes)

### 6.1 Pre-launch review
- [ ] Tous les checklist items cochés ✓
- [ ] Secrets configurés et testés
- [ ] Migrations appliquées
- [ ] Build successful
- [ ] SSL certificate valide
- [ ] DNS configured
- [ ] Backup tested

### 6.2 Rollback Plan
- [ ] Procédure de rollback documentée
- [ ] Ancien version versionée dans git
- [ ] DB backup pris avant migration
- [ ] Docker images tagged avec version

### 6.3 Équipe Avertie
- [ ] Product manager avisé
- [ ] Équipe support notifiée
- [ ] On-call engineer disponible
- [ ] Slack channel de déploiement créé

---

## 🚀 Commands de Déploiement Référence

```bash
# 1. Cloner et installer
git clone <repo> scbap-prod
cd scbap-prod
git checkout <version-tag>
npm install --production

# 2. Migrer la base de données
cd scbap-backend
npm run prisma:migrate:deploy
npm run seed:admin

# 3. Build les applications
cd ../scbap-backend
npm run build

cd ../scbap-frontend
npm run build

# 4. Démarrer avec Docker Compose
cd ..
docker-compose -f docker-compose.prod.yml up -d

# 5. Vérifier les services
docker-compose -f docker-compose.prod.yml ps
curl https://api.yourdomain.com/health
curl https://yourdomain.com/health

# 6. Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 📋 Checkpoints d'Arrêt

**NE PAS CONTINUER SI:**

- [ ] ❌ CORS still accepts all origins
- [ ] ❌ Secrets not generated or too short
- [ ] ❌ DATABASE_URL failing
- [ ] ❌ Build errors remaining
- [ ] ❌ Auth tests failing
- [ ] ❌ SSL certificate not valid
- [ ] ❌ Migrations not applied
- [ ] ❌ Backup not tested

**SI L'UN DE CES CRITÈRES N'EST PAS MET, ARRÊTEZ ET CORRIGEZ!**

---

## 🆘 Contact Rapide

- **Questions sécurité**: Voir `RAPPORT-DEPLOIEMENT.md` section Sécurité
- **Erreurs déploiement**: Voir `DEPLOYMENT.md` section Dépannage
- **Configuration**: Voir `.env.example` files
- **Architecture**: Voir `ARCHITECTURE.md` (à créer)

---

## ✨ Après le Déploiement

1. **Monitoring 24h**: Surveiller les logs et métriques
2. **Smoke tests**: Tester login, upload, search
3. **User communication**: Annoncer le déploiement
4. **Bug fix ready**: Équipe prête à hotfix si problème
5. **Rollback backup**: Garder ancienne version accessible

---

**Généré**: 29 mai 2026  
**Status**: REQUIS avant production  
**Approbation par**: [À remplir]
