# Image du projet, construite depuis la racine du dépôt : docker build -f backend/Dockerfile .
# Cibles : front-dev et dev (docker-compose.yml), production (par défaut : API + front compilé).

ARG NODE_VERSION=22-alpine

# Front : dépendances, puis build de frontend/dist.
FROM node:${NODE_VERSION} AS front-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM front-deps AS front-dev
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM front-deps AS front-build
COPY frontend/ ./
RUN npm run build

# Back : toutes les dépendances (développement et build). Pas de téléchargement de MongoDB pour les tests.
FROM node:${NODE_VERSION} AS back-deps
ENV MONGOMS_DISABLE_POSTINSTALL=1
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM back-deps AS dev
COPY backend/ ./
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM back-deps AS back-build
COPY backend/ ./
RUN npm run build

# Dépendances de production seulement.
FROM node:${NODE_VERSION} AS back-prod-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Image finale : l'API sert le front compilé (frontend/dist, voir configuration.ts), utilisateur non root.
FROM node:${NODE_VERSION} AS production
ENV NODE_ENV=production PORT=3000
WORKDIR /app/backend
COPY --from=back-prod-deps --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=back-build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/package.json ./
COPY --from=front-build --chown=node:node /app/frontend/dist /app/frontend/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/index.js"]
