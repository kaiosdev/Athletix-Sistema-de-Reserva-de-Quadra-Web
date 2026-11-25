-- Athletix Web - Esquema do banco PostgreSQL
-- Uso: crie o banco `athletix_web` e execute este script nele.

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

-- Regra de negócio reforçada no banco: impede choque de horário
-- entre reservas ATIVAS da mesma quadra no mesmo dia.
CREATE OR REPLACE FUNCTION func_valida_choque_horario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ativa' AND EXISTS (
        SELECT 1 FROM reservas r
        WHERE r.quadra_id = NEW.quadra_id
          AND r.data = NEW.data
          AND r.status = 'ativa'
          AND r.id <> COALESCE(NEW.id, -1)
          AND NEW.hora_inicio < r.hora_fim
          AND NEW.hora_fim > r.hora_inicio
    ) THEN
        RAISE EXCEPTION 'Choque de horário: a quadra já está reservada neste período.'
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_choque_horario
BEFORE INSERT OR UPDATE ON reservas
FOR EACH ROW EXECUTE FUNCTION func_valida_choque_horario();

-- Dados iniciais de exemplo (quadras). O administrador é criado com:
--   npm run criar-admin
INSERT INTO quadras (nome, modalidade, tamanho, valor_hora, descricao) VALUES
    ('Quadra 1', 'Futsal',   '40x20 m', 80.00, 'Quadra coberta com piso de alta resistência'),
    ('Quadra 2', 'Vôlei',    '18x9 m',  60.00, 'Quadra coberta com rede regulável'),
    ('Quadra 3', 'Basquete', '28x15 m', 70.00, 'Quadra com tabelas oficiais');
