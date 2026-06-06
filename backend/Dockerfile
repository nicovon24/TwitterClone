FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
