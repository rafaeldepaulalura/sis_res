// A migration cria o role `app_user` com uma senha fixa de desenvolvimento
// (`app_user_pw`) para funcionar sem configuração extra localmente. Em
// produção isso seria uma senha fraca e pública (o código está no GitHub),
// então no boot do container trocamos a senha do role para o valor real
// definido em APP_DATABASE_URL — a única cópia da senha vira essa env var.
const { execSync } = require('node:child_process');

const appUrl = process.env.APP_DATABASE_URL;
if (!appUrl) {
  process.exit(0);
}

const password = new URL(appUrl).password;
if (!password) {
  process.exit(0);
}

const escaped = password.replace(/'/g, "''");
const sql = `ALTER ROLE app_user WITH PASSWORD '${escaped}';`;

execSync(`npx prisma db execute --url "${process.env.DATABASE_URL}" --stdin`, {
  input: sql,
  stdio: ['pipe', 'inherit', 'inherit'],
});
