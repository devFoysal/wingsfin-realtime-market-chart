FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

FROM deps AS build
WORKDIR /app
COPY backend backend
RUN npm run build -w backend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/backend/dist backend/dist
COPY backend/migrations backend/migrations
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/server.js"]
