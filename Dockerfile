# Dockerfile
FROM node:20-slim AS base

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

# 모든 소스 파일 복사
COPY . .

# 기존 빌드 캐시 완전히 삭제
RUN rm -rf .next

# Next.js 빌드 (standalone 모드)
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

# 데이터 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
