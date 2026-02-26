FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/

# --- ОСЬ ЦЕЙ РЯДОК МИ ДОДАЛИ ---
# Заходимо в папку сервера і встановлюємо бібліотеки (express, pg, cors)
RUN cd server && npm install --omit=dev
# -------------------------------

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "server/index.js"]