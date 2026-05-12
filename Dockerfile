FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Data directory — mount a volume here to persist between restarts
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server/index.js"]
