-- Reset de dados de teste
-- Execute na ordem abaixo para evitar erro de foreign key

DELETE FROM pedidos
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);

DELETE FROM itens_cardapio
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);

DELETE FROM categorias
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);

DELETE FROM mesas
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);


-- Encerra a sessão atual de todas as mesas sem apagar pedidos
UPDATE mesas
SET ultima_liberacao = NOW()
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);

-- Apagar pedidos hoje
DELETE FROM pedidos
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
)
AND criado_em::date = CURRENT_DATE;