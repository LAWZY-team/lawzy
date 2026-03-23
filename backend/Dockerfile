FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
# Compile policy-content.ts and seed.ts for prisma seed (production has no ts-node)
RUN npx tsc prisma/policy-content.ts prisma/seed.ts --outDir prisma --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck
RUN rm -rf node_modules
RUN npm ci --omit=dev
RUN npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node dist/main"]
