FROM node:20-alpine

WORKDIR /app

COPY dist ./dist
COPY package.json ./
COPY .env.example ./.env

RUN npm install --production

RUN mkdir -p public/upload

EXPOSE 3000

CMD ["node", "dist/server.js"]