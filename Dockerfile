# Dockerfile
FROM node:20-slim AS base

# OpenSSL 및 필수 라이브러리 설치
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies stage
FROM base AS deps

# package.json 복사
COPY package.json ./

# 의존성 완전히 새로 설치
RUN npm cache clean --force
RUN npm install

# Builder stage
FROM base AS builder

# deps에서 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules

# 모든 소스 파일 복사 (prisma 포함)
COPY . .

# 기존 빌드 캐시 완전히 삭제
RUN rm -rf .next

# Prisma client 생성
RUN npx prisma generate

# Next.js 완전히 새로 빌드 (standalone 모드)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 비root 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 빌드 결과물 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma 관련 파일 복사
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI 복사 (DB 마이그레이션용)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 데이터 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 시작 스크립트 복사
COPY --chown=nextjs:nodejs start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
