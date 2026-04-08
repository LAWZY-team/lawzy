# Slim image thiếu OpenSSL đầy đủ có thể làm Prisma/HTTPS lỗi; thêm CA cho fetch ra ngoài.
FROM node:22-bookworm-slim
RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
