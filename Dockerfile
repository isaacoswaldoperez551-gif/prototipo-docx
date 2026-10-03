# Multi-stage Dockerfile for DocuGuard (Node.js 20 LTS Alpine)
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema requeridas
RUN apk add --no-cache libc6-compat python3 make g++

# Copiar manifiestos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Construir cliente y servidor
RUN npm run build

# Stage de Producción
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Crear usuario sin privilegios root para mitigar escalada
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 docuguard

# Crear directorio de almacenamiento no público
RUN mkdir -p /app/storage/documents && \
    chown -R docuguard:nodejs /app/storage

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/prisma ./prisma

USER docuguard

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
