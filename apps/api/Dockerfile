FROM node:20-alpine
RUN addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
USER lms
ENV API_PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
  CMD wget -q -O /dev/null http://127.0.0.1:4000/health || exit 1
CMD ["node", "src/index.js"]
