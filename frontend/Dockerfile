FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

FROM deps AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY frontend frontend
RUN npm run build -w frontend

FROM nginx:1.27-alpine AS runner
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
