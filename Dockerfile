FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# One image for every backend app (gateway, microservices, batch).
# Each container in compose.yaml picks its app with `command: node dist/apps/<app>/main`.
RUN npm run build:all

EXPOSE 3000 4001 4002 4003 4004 4005

CMD ["node", "dist/apps/nestar-api/main"]
