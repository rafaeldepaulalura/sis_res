# Build: instala todas as deps (precisa das devDependencies pra compilar) e
# gera o client do Prisma + o build do Nest.
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime: só o necessário pra rodar. Mantém a CLI do Prisma (node_modules
# inteiro) porque o entrypoint roda `prisma migrate deploy` no boot.
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
