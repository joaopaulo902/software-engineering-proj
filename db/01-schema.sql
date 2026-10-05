-- INF01127 - Etapa 2
-- Esquema do banco. Cada restricao aqui e uma regra de negocio que o banco
-- passa a garantir sozinho, mesmo que o codigo da aplicacao esqueca de conferir.

CREATE TYPE papel_usuario AS ENUM ('ESTUDANTE', 'COORDENADOR', 'ADMIN');

CREATE TYPE status_candidatura AS ENUM (
    'EM_ANALISE',   -- recem submetida, aguardando o coordenador (C04)
    'ACEITA',       -- coordenador aprovou (C11)
    'RECUSADA',     -- coordenador recusou (C11)
    'CONFIRMADA',   -- estudante confirmou o ingresso (C07)
    'CANCELADA'     -- estudante desistiu
);

CREATE TABLE usuario (
    id        SERIAL PRIMARY KEY,
    nome      TEXT          NOT NULL,
    email     TEXT          NOT NULL UNIQUE,
    papel     papel_usuario NOT NULL,
    curso     TEXT,
    semestre  INTEGER       CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 20),
    criado_em TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE projeto (
    id             SERIAL PRIMARY KEY,
    nome           TEXT    NOT NULL,
    descricao      TEXT    NOT NULL,
    area           TEXT    NOT NULL,
    coordenador_id INTEGER NOT NULL REFERENCES usuario(id)
);

CREATE TABLE vaga (
    id                SERIAL PRIMARY KEY,
    projeto_id        INTEGER NOT NULL REFERENCES projeto(id),
    titulo            TEXT    NOT NULL,
    requisitos        TEXT    NOT NULL,
    carga_horaria     INTEGER NOT NULL CHECK (carga_horaria > 0),
    turno             TEXT    NOT NULL,
    modalidade        TEXT    NOT NULL,
    semestre_minimo   INTEGER NOT NULL DEFAULT 1,
    vagas_totais      INTEGER NOT NULL CHECK (vagas_totais > 0),
    -- nunca pode ficar negativo: o banco recusa a transacao que tentar
    vagas_restantes   INTEGER NOT NULL CHECK (vagas_restantes >= 0),
    data_encerramento DATE    NOT NULL,
    CHECK (vagas_restantes <= vagas_totais)
);

CREATE TABLE candidatura (
    id           SERIAL PRIMARY KEY,
    vaga_id      INTEGER            NOT NULL REFERENCES vaga(id),
    estudante_id INTEGER            NOT NULL REFERENCES usuario(id),
    status       status_candidatura NOT NULL DEFAULT 'EM_ANALISE',
    mensagem     TEXT,
    criada_em    TIMESTAMPTZ        NOT NULL DEFAULT now(),
    -- torna impossivel um estudante se candidatar duas vezes a mesma vaga,
    -- mesmo que a verificacao no servico falhe
    UNIQUE (vaga_id, estudante_id)
);

-- apoia a busca de vagas por area e a listagem de candidaturas do estudante
CREATE INDEX idx_vaga_projeto      ON vaga (projeto_id);
CREATE INDEX idx_candidatura_estud ON candidatura (estudante_id);
