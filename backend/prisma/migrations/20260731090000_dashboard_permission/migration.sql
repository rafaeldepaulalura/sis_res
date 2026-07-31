-- A tela inicial (Dashboard) entrou depois que os funcionários já estavam
-- cadastrados, então ninguém tinha a permissão nova e todo mundo caía em
-- "sem acesso" ao entrar. Concede 'dashboard' a quem já opera no salão.
--
-- Cozinha e motoboy ficam de fora de propósito: eles têm tela própria
-- (KDS / entregas) e o painel não serve para o trabalho deles.
UPDATE "User"
SET permissions = array_append(permissions, 'dashboard')
WHERE NOT ('dashboard' = ANY (permissions))
  AND permissions && ARRAY['mesas', 'balcao', 'comandas', 'relatorios', 'financeiro', 'configuracoes'];
