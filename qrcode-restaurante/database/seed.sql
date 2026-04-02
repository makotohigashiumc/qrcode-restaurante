-- ============================================================
-- qrcode-restaurante | Dados de exemplo (seed)
-- Execute APÓS o schema.sql
-- Senha do admin: admin123 (hash bcrypt)
-- ============================================================

-- Restaurante de exemplo
INSERT INTO restaurantes (id, nome, email, senha_hash, telefone, cep, cidade, estado, logradouro, bairro)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Sabor & Arte',
    'admin@saborarte.com.br',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGfcLrH4VQKFwjJzMxwRJqSBkHW',  -- senha: admin123
    '(11) 99999-0001',
    '08780-000',
    'Mogi das Cruzes',
    'SP',
    'Rua das Flores, 123',
    'Centro'
) ON CONFLICT DO NOTHING;

-- Mesas
INSERT INTO mesas (restaurante_id, numero, ativa) VALUES
    ('11111111-1111-1111-1111-111111111111', 1, true),
    ('11111111-1111-1111-1111-111111111111', 2, true),
    ('11111111-1111-1111-1111-111111111111', 3, true),
    ('11111111-1111-1111-1111-111111111111', 4, true),
    ('11111111-1111-1111-1111-111111111111', 5, true),
    ('11111111-1111-1111-1111-111111111111', 6, true),
    ('11111111-1111-1111-1111-111111111111', 7, true),
    ('11111111-1111-1111-1111-111111111111', 8, true)
ON CONFLICT DO NOTHING;

-- Categorias
INSERT INTO categorias (id, restaurante_id, nome, ordem) VALUES
    ('aaaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Entradas', 1),
    ('aaaa0001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pratos Principais', 2),
    ('aaaa0001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Sobremesas', 3),
    ('aaaa0001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Bebidas', 4)
ON CONFLICT DO NOTHING;

-- Itens do cardápio
INSERT INTO itens_cardapio (restaurante_id, categoria_id, nome, descricao, preco, disponivel) VALUES
    -- Entradas
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000001',
     'Bruschetta Clássica', 'Pão italiano grelhado com tomate, manjericão fresco e azeite', 22.90, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000001',
     'Bolinho de Bacalhau', 'Bolinhos crocantes de bacalhau com ervas finas (6 unidades)', 32.50, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000001',
     'Carpaccio de Carne', 'Finas fatias de carne com rúcula, parmesão e molho de limão', 38.00, true),

    -- Pratos Principais
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000002',
     'Filé ao Molho Madeira', 'Filé mignon grelhado com molho madeira, arroz e batata rústica', 68.90, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000002',
     'Risoto de Camarão', 'Risoto cremoso com camarões frescos, limão siciliano e ervas', 72.00, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000002',
     'Salmão Grelhado', 'Salmão com crosta de ervas, purê de batata-baroa e legumes', 76.50, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000002',
     'Frango à Parmegiana', 'Frango empanado ao molho de tomate caseiro com mussarela derretida', 52.90, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000002',
     'Massa ao Funghi', 'Tagliatelle ao molho cremoso de funghi porcini com parmesão', 58.00, true),

    -- Sobremesas
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000003',
     'Petit Gâteau', 'Bolo de chocolate quente com sorvete de baunilha e calda', 28.90, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000003',
     'Tiramisù', 'Sobremesa italiana com mascarpone, café e cacau em pó', 26.00, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000003',
     'Pudim de Leite', 'Pudim cremoso com calda de caramelo artesanal', 18.90, true),

    -- Bebidas
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000004',
     'Água Mineral', 'Garrafa 500ml com ou sem gás', 6.00, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000004',
     'Suco Natural', 'Laranja, limão, maracujá ou abacaxi (400ml)', 14.90, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000004',
     'Refrigerante Lata', 'Coca-Cola, Guaraná ou Sprite 350ml', 8.00, true),
    ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000004',
     'Vinho da Casa (Taça)', 'Vinho tinto ou branco selecionado pelo sommelier', 24.00, true)
ON CONFLICT DO NOTHING;
