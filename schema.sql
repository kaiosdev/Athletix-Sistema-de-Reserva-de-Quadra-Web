-- Athletix Web - Esquema do banco PostgreSQL
-- Uso: crie o banco `athletix_db` e execute este script nele.

DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS quadras CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id             SERIAL PRIMARY KEY,
    nome           VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    senha_hash     VARCHAR(100) NOT NULL,
    perfil         VARCHAR(10)  NOT NULL DEFAULT 'cliente'
                   CHECK (perfil IN ('cliente', 'admin')),
    data_cadastro  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE quadras (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100)  NOT NULL UNIQUE,
    modalidade  VARCHAR(50)   NOT NULL,
    tamanho     VARCHAR(50),
    valor_hora  NUMERIC(10,2) NOT NULL CHECK (valor_hora >= 0),
    descricao   TEXT
);

CREATE TABLE reservas (
    id            SERIAL PRIMARY KEY,
    usuario_id    INT           NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    quadra_id     INT           NOT NULL REFERENCES quadras (id) ON DELETE RESTRICT,
    data          DATE          NOT NULL,
    hora_inicio   TIME          NOT NULL,
    hora_fim      TIME          NOT NULL,
    status        VARCHAR(10)   NOT NULL DEFAULT 'ativa'
                  CHECK (status IN ('ativa', 'cancelada')),
    valor_total   NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
    data_criacao  TIMESTAMP     NOT NULL DEFAULT NOW(),
    CHECK (hora_fim > hora_inicio)
);

CREATE INDEX idx_reservas_quadra_data ON reservas (quadra_id, data);
CREATE INDEX idx_reservas_usuario ON reservas (usuario_id);

