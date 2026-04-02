-- ============================================================
-- qrcode-restaurante | Schema PostgreSQL (Supabase)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: restaurantes
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurantes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    email       VARCHAR(200) NOT NULL UNIQUE,
    senha_hash  VARCHAR(255) NOT NULL,
    telefone    VARCHAR(20),
    cep         VARCHAR(9),
    cidade      VARCHAR(100),
    estado      VARCHAR(2),
    logradouro  VARCHAR(200),
    bairro      VARCHAR(100),
    criado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABELA: mesas
-- ============================================================
CREATE TABLE IF NOT EXISTS mesas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    numero          INTEGER NOT NULL,
    qr_code         TEXT,
    ativa           BOOLEAN DEFAULT TRUE,
    UNIQUE(restaurante_id, numero)
);

-- ============================================================
-- TABELA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    nome            VARCHAR(100) NOT NULL,
    ordem           INTEGER DEFAULT 0
);

-- ============================================================
-- TABELA: itens_cardapio
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_cardapio (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    categoria_id    UUID REFERENCES categorias(id) ON DELETE SET NULL,
    nome            VARCHAR(200) NOT NULL,
    descricao       TEXT,
    preco           NUMERIC(10,2) NOT NULL,
    imagem_url      TEXT,
    disponivel      BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABELA: pedidos
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id         UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
    restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    nome_cliente    VARCHAR(150),
    status          VARCHAR(30) NOT NULL DEFAULT 'recebido'
                        CHECK (status IN ('recebido','em_preparo','pronto','entregue','cancelado')),
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    criado_em       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABELA: itens_pedido
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_pedido (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    item_cardapio_id    UUID NOT NULL REFERENCES itens_cardapio(id),
    quantidade          INTEGER NOT NULL DEFAULT 1,
    preco_unitario      NUMERIC(10,2) NOT NULL,
    observacao          TEXT
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mesas_restaurante ON mesas(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_categorias_restaurante ON categorias(restaurante_id);
-- Evita categorias duplicadas por restaurante (case/whitespace-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_restaurante_nome_norm
    ON categorias (restaurante_id, (LOWER(TRIM(nome))));
CREATE INDEX IF NOT EXISTS idx_itens_restaurante ON itens_cardapio(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa ON pedidos(mesa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante ON pedidos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON itens_pedido(pedido_id);

-- ============================================================
-- TRIGGER: atualiza atualizado_em em pedidos
-- ============================================================
CREATE OR REPLACE FUNCTION atualiza_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_atualizado ON pedidos;
CREATE TRIGGER trg_pedidos_atualizado
    BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION atualiza_timestamp();
