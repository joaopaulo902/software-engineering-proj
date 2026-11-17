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

CREATE TYPE situacao_projeto AS ENUM ('ATIVO', 'INATIVO');

CREATE TABLE projeto (
    id                     SERIAL PRIMARY KEY,
    nome                   TEXT             NOT NULL,
    descricao              TEXT             NOT NULL,
    area                   TEXT             NOT NULL,
    icone                  TEXT,
    situacao               situacao_projeto NOT NULL DEFAULT 'ATIVO',
    -- nome do coordenador como consta na base da Comissao de Extensao
    coordenador_cadastrado TEXT             NOT NULL DEFAULT '',
    -- vazio enquanto nenhum coordenador do sistema incorporou o projeto (C17)
    coordenador_id         INTEGER          REFERENCES usuario(id)
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
    -- Etapa 3 (frente C). Todas tem valor padrao, para que as vagas
    -- cadastradas antes continuem validas.
    descricao         TEXT    NOT NULL DEFAULT '' CHECK (length(descricao) <= 2000),
    areas_tematicas   TEXT[]  NOT NULL DEFAULT '{}',
    -- lista vazia = aceita estudantes de todos os cursos
    cursos_aceitos    TEXT[]  NOT NULL DEFAULT '{}',
    beneficio         TEXT    NOT NULL DEFAULT 'Horas de extensão'
                              CHECK (beneficio IN ('Horas de extensão', 'Bolsa')),
    -- vazio = participacao sem prazo definido
    duracao_em_meses  INTEGER CHECK (duracao_em_meses IS NULL OR duracao_em_meses BETWEEN 1 AND 24),
    publicada_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
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

-- ---------------------------------------------------------------------------
-- Frente B: projetos e avisos (Etapa 3)
-- ---------------------------------------------------------------------------

-- Vinculo de um usuario com a equipe de um projeto. A dupla A cria a linha
-- ao confirmar o ingresso (C07); a frente B le em Meus Projetos, na lista de
-- participantes e na regra de quem pode postar atividade (C10).
CREATE TABLE participacao (
    id                SERIAL PRIMARY KEY,
    projeto_id        INTEGER     NOT NULL REFERENCES projeto(id),
    usuario_id        INTEGER     NOT NULL REFERENCES usuario(id),
    candidatura_id    INTEGER     REFERENCES candidatura(id),
    cargo             TEXT        NOT NULL DEFAULT 'Participante',
    inicio            TIMESTAMPTZ NOT NULL DEFAULT now(),
    fim               TIMESTAMPTZ,
    previsto_ate      DATE,
    mensagem_de_saida TEXT,
    CHECK (fim IS NULL OR fim >= inicio)
);

-- no maximo uma participacao ATIVA por pessoa em cada projeto
CREATE UNIQUE INDEX uq_participacao_ativa
    ON participacao (projeto_id, usuario_id) WHERE fim IS NULL;
CREATE INDEX idx_participacao_usuario ON participacao (usuario_id);

-- C10 - Postar atividade do projeto
CREATE TABLE atividade (
    id           SERIAL PRIMARY KEY,
    projeto_id   INTEGER     NOT NULL REFERENCES projeto(id),
    autor_id     INTEGER     NOT NULL REFERENCES usuario(id),
    titulo       TEXT        NOT NULL CHECK (length(titulo) BETWEEN 3 AND 100),
    descricao    TEXT        NOT NULL CHECK (length(descricao) BETWEEN 1 AND 2000),
    foto_url     TEXT,
    publicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividade_projeto ON atividade (projeto_id);

-- Avisos in-app, gravados pelo NotificadorInApp (padrao Observer)
CREATE TYPE tipo_notificacao AS ENUM (
    'NOVA_CANDIDATURA',          -- C04, para o coordenador
    'RESULTADO_DA_AVALIACAO',    -- C11, para o estudante
    'CONFIRMACAO_DE_INGRESSO',   -- C07, para o coordenador
    'DECLINIO_DE_INGRESSO',      -- C07 2.a, para o coordenador
    'NOVA_ATIVIDADE',            -- C10, para a equipe do projeto
    'AVALIACAO_RECEBIDA',        -- C08
    'NOVA_DENUNCIA',             -- C13, para os administradores
    'PEDIDO_DE_INCORPORACAO',    -- C17, para os administradores
    'RESULTADO_DA_INCORPORACAO', -- C17, para o coordenador
    'FIM_DE_PARTICIPACAO',       -- C08, para o coordenador
    'ATUALIZACAO_DE_DENUNCIA'    -- C13, para o denunciante
);

CREATE TABLE notificacao (
    id              SERIAL PRIMARY KEY,
    destinatario_id INTEGER          NOT NULL REFERENCES usuario(id),
    tipo            tipo_notificacao NOT NULL,
    texto           TEXT             NOT NULL,
    -- id do que a notificacao fala (candidatura, projeto, denuncia...),
    -- para o front abrir a tela certa ao clicar
    referencia_id   INTEGER,
    lida            BOOLEAN          NOT NULL DEFAULT false,
    criada_em       TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacao_destinatario ON notificacao (destinatario_id, criada_em DESC);
