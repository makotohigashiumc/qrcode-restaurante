-- Contagem geral por tabela
SELECT 'mesas'          AS tabela, COUNT(*) AS total FROM mesas
UNION ALL
SELECT 'categorias',      COUNT(*) FROM categorias
UNION ALL
SELECT 'itens_cardapio',  COUNT(*) FROM itens_cardapio
UNION ALL
SELECT 'pedidos',         COUNT(*) FROM pedidos
UNION ALL
SELECT 'itens_pedido',    COUNT(*) FROM itens_pedido;


-- Pedidos com detalhes
SELECT id, nome_cliente, status, total, criado_em
FROM pedidos
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
)
ORDER BY criado_em DESC
LIMIT 20;


-- Itens de cada pedido
SELECT p.nome_cliente, m.numero AS mesa, p.status, p.total,
       ic.nome AS item, ip.quantidade, ip.preco_unitario
FROM itens_pedido ip
JOIN pedidos p ON p.id = ip.pedido_id
JOIN itens_cardapio ic ON ic.id = ip.item_cardapio_id
JOIN mesas m ON m.id = p.mesa_id
WHERE p.restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
)
ORDER BY p.criado_em DESC
LIMIT 20;


-- Mesas com QR code
SELECT numero, qr_code, ultima_liberacao
FROM mesas
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
)
ORDER BY numero;


-- Total de pedidos
SELECT COUNT(*) AS total_pedidos
FROM pedidos
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);

-- Gera QR code para mesas que estão sem QR code
UPDATE mesas
SET qr_code = 'https://qrcode-restaurante.vercel.app/?mesa=' || numero || '&restaurante=' || restaurante_id::text
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
)
AND (qr_code IS NULL OR qr_code = '');


SELECT numero, qr_code
FROM mesas
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
)
ORDER BY numero;


UPDATE mesas SET ultima_liberacao = NOW()
WHERE restaurante_id = (
  SELECT id FROM restaurantes WHERE email = 'makotomatias3@gmail.com'
);
