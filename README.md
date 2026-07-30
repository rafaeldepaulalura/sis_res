# Restaurante SaaS — MVP (Fase 1)

Sistema de gestão para restaurantes e delivery: PDV, mesas, comandas, cozinha
(KDS), delivery próprio e emissão de nota fiscal via Focus NFe.

Monorepo:

```
restaurante-saas/
├── backend/     # NestJS + Prisma + PostgreSQL + Socket.io
├── frontend/    # React + Vite + TypeScript + Tailwind
├── docker-compose.yml   # Postgres para desenvolvimento
└── package.json # scripts de conveniência (dev/build/lint)
```

> **Multi-tenant desde já:** toda tabela operacional tem `establishmentId`.
> A Fase 1 roda com um único estabelecimento fixo. RLS e white-label são fases
> futuras.

## Pré-requisitos

- **Node.js** 18+ (recomendado 20 LTS — o projeto está pinado para rodar no 18)
- **Docker** + Docker Compose (para o Postgres)
- **npm** 9+

## Setup local (primeira vez)

```bash
# 1. Copie os arquivos de ambiente
cp .env.example .env                    # credenciais do Postgres (docker-compose)
cp backend/.env.example backend/.env    # config do backend (DATABASE_URL, JWT...)

# 2. Instale as dependências (raiz + backend + frontend)
npm run install:all

# 3. Suba o banco
npm run db:up

# 4. (Bloco 2 em diante) migrations + seed
#    cd backend && npx prisma migrate dev && npm run db:seed
```

## Rodando em desenvolvimento

```bash
npm run dev        # sobe backend (:3000) e frontend (:5173) juntos
# ou separadamente:
npm run dev:backend
npm run dev:frontend
```

- Backend: http://localhost:3000/api/v1/health
- Frontend: http://localhost:5173 (proxy de `/api` e `/socket.io` para o backend)

## Scripts úteis (raiz)

| Script                | O que faz                                    |
| --------------------- | -------------------------------------------- |
| `npm run db:up`       | Sobe o Postgres via docker-compose           |
| `npm run db:down`     | Derruba o Postgres                            |
| `npm run dev`         | Backend + frontend em paralelo               |
| `npm run build`       | Build de produção dos dois                   |
| `npm run lint`        | Lint dos dois                                |
| `npm run install:all` | Instala dependências em tudo                 |

## Stack

- **Backend:** NestJS 10, Prisma 5, PostgreSQL 16, Socket.io 4, JWT
- **Frontend:** React 18, Vite 5, TypeScript, Tailwind 3, React Query, Zustand,
  React Router
- **Fiscal:** Focus NFe (homologação primeiro)

## Progresso (Ordem de Implementação)

- [x] Bloco 1 — Setup do projeto
- [x] Bloco 2 — Schema Prisma + seed
- [x] Bloco 3 — Auth + RBAC
- [x] Bloco 4 — Produtos/Categorias
- [x] Bloco 5 — Mesas + Comandas
- [x] Bloco 6 — Frontend (layout + mesas + comanda)
- [x] Bloco 7 — Caixa/Pagamento
- [x] Bloco 8 — KDS + WebSocket
- [x] Bloco 9 — Cardápio Digital público
- [x] Bloco 10 — Clientes + Endereços
- [x] Bloco 11 — Delivery + PWA motoboy
- [ ] Bloco 12 — Módulo Fiscal (Focus NFe) — adiado, será o último
- [x] Bloco 13 — Relatório de vendas

### Fase 2 — Multi-Tenant, SaaS e Billing

- [x] F2-B1 — RLS + hierarquia de tenant (Reseller, roles globais, isolamento no banco)
- [x] F2-B2 — Painel Super Admin (Plan, ResellerSubscription, /admin, guard SUPER_ADMIN)
- [x] F2-B3 — Painel do Revendedor (/reseller: establishments, branding, usage)
- [x] F2-B4 — Frontend dos painéis + white-label (roteamento por papel, tema do revendedor)
- [ ] F2-B5 — Assinatura (Asaas)
- [ ] F2-B6 — Cota de notas fiscais
- [ ] F2-B7 — Estoque com ficha técnica
- [ ] F2-B8 — Financeiro completo
- [ ] F2-B9 — Eventos n8n / WhatsApp

> **Fase 2 mudou a conexão do banco:** o backend agora conecta como `app_user`
> (sem superuser, sujeito ao RLS) via `APP_DATABASE_URL`; migrations e seed
> seguem com `DATABASE_URL` (owner). Rode `cp backend/.env.example backend/.env`
> e `npx prisma migrate deploy` ao clonar em outra máquina.
