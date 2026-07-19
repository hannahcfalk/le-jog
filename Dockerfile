FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY server.js ./
COPY index.html app.js styles.css config.js gb.svg ./
COPY data ./data
COPY scripts ./scripts

CMD ["node", "server.js"]
