#!/bin/sh
set -e

# O Postgres do EasyPanel pode demorar alguns segundos a mais que o backend
# para aceitar conexões no primeiro boot do projeto — espera em vez de falhar.
echo "Aguardando o banco de dados..."
tries=0
until printf 'SELECT 1;' | npx prisma db execute --url "$DATABASE_URL" --stdin > /dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "Banco de dados não respondeu a tempo."
    exit 1
  fi
  sleep 2
done

echo "Aplicando migrations..."
npx prisma migrate deploy

node scripts/sync-app-user-password.js

echo "Iniciando aplicação..."
exec node dist/main
