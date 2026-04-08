FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
# Compile policy-content.ts, email-templates-seed.ts and seed.ts for prisma seed (production has no ts-node)
RUN npx tsc prisma/policy-content.ts prisma/email-templates-seed.ts prisma/seed.ts --outDir prisma --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck
RUN rm -rf node_modules
RUN npm ci --omit=dev
RUN npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV LEGAL_CRAWLER_TLS_STRICT=true
ENV NODE_EXTRA_CA_CERTS=/app/tls/globalsign-rsa-ov-ssl-ca-2018.pem

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tls ./tls

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && (node prisma/seed.js || true) && exec node dist/src/main"]
