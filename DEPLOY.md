# Deploy no EasyPanel

O sistema tem 3 partes, cada uma um serviço separado no mesmo projeto do
EasyPanel:

1. **Postgres** (banco — use o template gerenciado do EasyPanel)
2. **backend** (API NestJS — `backend/Dockerfile`)
3. **frontend** (site estático — `frontend/Dockerfile`, servido via nginx)

Repositório: https://github.com/rafaeldepaulalura/sis_res

---

## 1. Criar o projeto e o Postgres

No EasyPanel: **Create Project** → dentro dele, **Add Service → Postgres**
(template gerenciado). Anote o host interno, porta, usuário e senha que ele
gera — vai precisar no passo 2.

## 2. Serviço backend

**Add Service → App** (fonte: Git), aponte para este repositório.

- **Build path / contexto**: `backend`
- **Dockerfile**: `backend/Dockerfile` (o EasyPanel detecta sozinho se o
  contexto já for `backend`)
- **Porta exposta**: `3000`

### Variáveis de ambiente do backend

| Variável | Valor | Observação |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | `postgresql://<user>:<senha>@<host-do-postgres>:5432/<db>?schema=public` | Use o usuário **superuser** que o EasyPanel criou no passo 1. Só é usada para rodar migrations. |
| `APP_DATABASE_URL` | `postgresql://app_user:<SENHA-FORTE-SUA>@<host-do-postgres>:5432/<db>?schema=public` | Escolha você mesmo essa senha (não reaproveite a de dev). No boot, o backend sincroniza sozinho o usuário `app_user` do banco para esta senha — ver `backend/scripts/sync-app-user-password.js`. |
| `JWT_ACCESS_SECRET` | gere com `openssl rand -base64 48` | |
| `JWT_REFRESH_SECRET` | gere com `openssl rand -base64 48` (diferente do access) | |
| `JWT_ACCESS_EXPIRES` | `15m` | |
| `JWT_REFRESH_EXPIRES` | `7d` | |
| `CORS_ORIGIN` | `https://app.seudominio.com` | Domínio público do **frontend** (passo 3). Aceita vários separados por vírgula. |
| `BACKEND_PORT` | `3000` | |
| `DEFAULT_ESTABLISHMENT_SLUG` | `meu-restaurante` | Só usado pelo seed inicial (passo 5). |

Depois de configurar, faça o deploy do backend e anote a URL pública que o
EasyPanel gerou pra ele (ex: `https://sisres-api.easypanel.host` ou o
domínio custom que você apontar) — é o que entra em `VITE_API_URL` no
próximo passo.

## 3. Serviço frontend

**Add Service → App** (mesmo repositório).

- **Build path / contexto**: `frontend`
- **Dockerfile**: `frontend/Dockerfile`
- **Porta exposta**: `80`

### Build args do frontend

O Vite embute essas variáveis **no build**, não em runtime — no EasyPanel
elas ficam na seção de **Build Arguments**, não nas env vars comuns do
serviço:

| Build arg | Valor |
|---|---|
| `VITE_API_URL` | URL pública do backend (passo 2), sem barra no final |
| `VITE_SOCKET_URL` | Igual à `VITE_API_URL` (mesmo host) |

Depois de configurar, faça o deploy do frontend.

## 4. Fechar o CORS

Volte no serviço **backend** e confirme que `CORS_ORIGIN` aponta pro
domínio público real do frontend (o que o EasyPanel deu, ou o seu domínio
custom se configurar um). Redeploy o backend se mudar.

## 5. Primeiro acesso (Super Admin)

Nada disso roda sozinho em produção — de propósito, pra não recriar dados
de demonstração toda vez. No EasyPanel, abra o **console/terminal** do
serviço backend e rode uma vez:

```bash
npx prisma db seed
```

Isso cria um Super Admin, um restaurante de exemplo e um admin desse
restaurante — as senhas estão em `backend/prisma/seed.ts`. **Troque essas
senhas assim que logar** (são as mesmas usadas em dev, então estão públicas
no GitHub). Se não for usar o restaurante de exemplo, apague-o depois pelo
painel de Super Admin.

## Domínio custom + HTTPS

O EasyPanel provisiona certificado (Let's Encrypt) automaticamente ao
apontar um domínio próprio para cada serviço. Configure isso nas
configurações de domínio de cada serviço (backend e frontend podem ficar
em subdomínios diferentes, ex: `api.seudominio.com` e `app.seudominio.com`).

## O que NÃO é usado em produção

- `docker-compose.yml` na raiz é só pra rodar o Postgres localmente em
  desenvolvimento — o EasyPanel usa o Postgres gerenciado dele (passo 1).
- `.env` / `.env.example` na raiz e em `backend/` e `frontend/` são só
  referência para desenvolvimento local; em produção as variáveis vêm da
  configuração do serviço no EasyPanel.
