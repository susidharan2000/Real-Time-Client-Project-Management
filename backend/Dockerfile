FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
# tsx runs the existing TypeScript server directly.
RUN npm ci && npm cache clean --force
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
CMD ["./node_modules/.bin/tsx", "src/server.ts"]
