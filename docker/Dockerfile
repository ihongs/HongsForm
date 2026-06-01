FROM node:20-alpine

WORKDIR /app

COPY dist ./dist
COPY package.json ./
COPY server ./server

RUN npm config set registry https://registry.npmmirror.com/ && npm install --production

RUN mkdir -p public/upload

EXPOSE 3000

CMD ["node", "dist/server.js"]