FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 10 \
  && npm config set fetch-retry-mintimeout 30000 \
  && npm config set fetch-retry-maxtimeout 300000 \
  && npm config set fetch-timeout 1200000 \
  && npm config set prefer-online true \
  && npm config set registry https://registry.npmjs.org/ \
  && npm ci --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN DATABASE_URL=postgresql://user:password@localhost:5432/scbap npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/prisma ./prisma
COPY scripts/start-with-migrations.sh /app/
RUN chmod +x /app/start-with-migrations.sh
EXPOSE 3000
CMD ["/app/start-with-migrations.sh"]
