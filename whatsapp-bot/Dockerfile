FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# Create audio output directory
RUN mkdir -p public/audio

EXPOSE 5001
ENV NODE_ENV=production
ENV PORT=5001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

CMD ["node", "src/index.js"]
