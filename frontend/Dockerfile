FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY . .
RUN npm run build:frontend

FROM nginx:1.29-alpine

COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
