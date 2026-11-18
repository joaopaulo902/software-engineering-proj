-- Dados de exemplo para a demonstração ao vivo.
-- As vagas foram montadas para que cada regra de negócio possa ser mostrada
-- em tela: o caminho feliz, a vaga encerrada, o pré-requisito de semestre,
-- a candidatura repetida e a última vaga disputada.

INSERT INTO usuario (nome, email, papel, curso, semestre) VALUES
  ('Comissão de Extensão INF', 'extensao@inf.ufrgs.br',   'ADMIN',       NULL,                       NULL),
  ('Profa. Carla Menezes',     'carla@inf.ufrgs.br',      'COORDENADOR', NULL,                       NULL),
  ('Prof. Rui Bastos',         'rui@inf.ufrgs.br',        'COORDENADOR', NULL,                       NULL),
  ('Ana Souza',                'ana@inf.ufrgs.br',        'ESTUDANTE',   'Ciência da Computação',    5),
  ('Bruno Lima',               'bruno@inf.ufrgs.br',      'ESTUDANTE',   'Ciência da Computação',    2),
  ('Carla Dias',               'carla.dias@inf.ufrgs.br', 'ESTUDANTE',   'Engenharia da Computação', 7),
  ('Diego Alves',              'diego@inf.ufrgs.br',      'ESTUDANTE',   'Ciência da Computação',    4);

INSERT INTO projeto (nome, descricao, area, coordenador_id) VALUES
  ('Robótica na Escola', 'Oficinas de robótica educacional em escolas públicas de Porto Alegre.', 'Educação', 2),
  ('Saúde Digital',      'Ferramentas de apoio a postos de saúde da região metropolitana.',       'Saúde',    3),
  ('Dados para Todos',   'Letramento em dados para associações de bairro.',                       'Dados',    2);

INSERT INTO vaga
  (projeto_id, titulo, requisitos, carga_horaria, turno, modalidade, semestre_minimo, vagas_totais, vagas_restantes, data_encerramento) VALUES
  -- caminho feliz: Ana (5º) e Diego (4º) atendem
  (1, 'Monitoria de Algoritmos',
      'Lógica de programação, didática, Python básico',
      8,  'Tarde', 'Presencial', 3, 2, 2, '2026-11-30'),

  -- ÚLTIMA VAGA: serve para demonstrar a transação sob concorrência
  (2, 'Desenvolvimento Web',
      'JavaScript, HTML, CSS, noções de banco de dados',
      12, 'Manhã', 'Remoto',     4, 1, 1, '2026-11-30'),

  -- pré-requisito alto: Bruno (2º) e Diego (4º) são barrados
  (3, 'Oficina de Dados',
      'Python, pandas, estatística básica, comunicação',
      10, 'Noite', 'Híbrido',    6, 3, 3, '2026-11-30'),

  -- já encerrada: serve para demonstrar a regra de prazo
  (1, 'Apoio em Eletrônica',
      'Arduino, soldagem, eletrônica básica',
      6,  'Tarde', 'Presencial', 1, 2, 2, '2026-09-15'),

  -- aberta a todos os semestres
  (2, 'Comunicação e Divulgação',
      'Redação, redes sociais, design básico',
      6,  'Manhã', 'Remoto',     1, 4, 4, '2026-12-20');

-- Uma candidatura já existente, para demonstrar a regra de candidatura repetida
-- quando a Ana tentar se candidatar de novo à Monitoria de Algoritmos.
INSERT INTO candidatura (vaga_id, estudante_id, status, mensagem) VALUES
  (1, 4, 'EM_ANALISE', 'Tenho interesse em atuar com ensino de algoritmos.');

UPDATE vaga SET vagas_restantes = vagas_restantes - 1 WHERE id = 1;

-- ---------------------------------------------------------------------------
-- Frente B: projetos e avisos (Etapa 3)
-- ---------------------------------------------------------------------------

-- Campos novos dos projetos que ja existiam
UPDATE projeto SET icone = '🤖', coordenador_cadastrado = 'Profa. Carla Menezes' WHERE id = 1;
UPDATE projeto SET icone = '🩺', coordenador_cadastrado = 'Prof. Rui Bastos'     WHERE id = 2;
UPDATE projeto SET icone = '📊', coordenador_cadastrado = 'Profa. Carla Menezes' WHERE id = 3;

-- Projeto homologado pela Comissao, mas ainda sem coordenador no sistema:
-- aparece na listagem, sem vagas, ate alguem incorpora-lo (C17).
INSERT INTO projeto (nome, descricao, area, icone, situacao, coordenador_cadastrado, coordenador_id) VALUES
  ('Inclusão Digital na Terceira Idade',
   'Oficinas de uso de celular e internet para pessoas idosas em centros comunitários.',
   'Educação', '📱', 'ATIVO', 'Prof. Marcos Teixeira', NULL);

-- Estudantes que ja fazem parte de equipes (como se tivessem passado pelo C07)
INSERT INTO participacao (projeto_id, usuario_id, cargo, inicio) VALUES
  (1, 6, 'Monitora',        '2026-08-10 09:00:00-03'),
  (2, 4, 'Desenvolvedora',  '2026-09-01 09:00:00-03');

-- Atividades para a Pagina do Projeto e o feed (C10)
INSERT INTO atividade (projeto_id, autor_id, titulo, descricao, publicada_em) VALUES
  (1, 2, 'Primeira oficina do semestre',
      'Recebemos 30 alunos da E.E. Rio Branco para montar robôs seguidores de linha.',
      '2026-10-05 15:00:00-03'),
  (1, 6, 'Kit novo de sensores',
      'Chegaram os sensores ultrassônicos que serão usados nas próximas oficinas.',
      '2026-10-20 10:30:00-03'),
  (2, 3, 'Piloto no posto da Vila Jardim',
      'O sistema de agendamento entrou em teste com a equipe de enfermagem.',
      '2026-11-03 14:00:00-03');

-- Avisos ja existentes, para o sino comecar com contador
INSERT INTO notificacao (destinatario_id, tipo, texto, referencia_id, lida, criada_em) VALUES
  (2, 'NOVA_CANDIDATURA',
      'Ana Souza se candidatou à vaga "Monitoria de Algoritmos" do projeto Robótica na Escola.',
      1, false, '2026-11-10 09:00:00-03'),
  (4, 'NOVA_ATIVIDADE',
      'Nova atividade em Saúde Digital: Piloto no posto da Vila Jardim.',
      2, true,  '2026-11-03 14:00:00-03');

-- ---------------------------------------------------------------------------
-- Frente C: campos novos das vagas (Etapa 3)
-- ---------------------------------------------------------------------------

-- Toda vaga ja existente ganha a area do seu projeto como area tematica.
UPDATE vaga v SET areas_tematicas = ARRAY[p.area] FROM projeto p WHERE p.id = v.projeto_id;

-- Descricoes, beneficio e duracao para os cards e a tela Detalhes da Vaga (C03).
-- As datas de publicacao sao relativas a hoje, para a ordem do feed fazer sentido.
UPDATE vaga SET
  descricao = 'Apoiar os alunos das escolas parceiras nas oficinas de lógica e programação em Python.',
  duracao_em_meses = 6,
  publicada_em = now() - interval '2 days'
WHERE id = 1;

UPDATE vaga SET
  descricao = 'Desenvolver as telas do sistema de agendamento usado pelos postos de saúde.',
  areas_tematicas = ARRAY['Saúde', 'Tecnologia'],
  cursos_aceitos = ARRAY['Ciência da Computação', 'Engenharia da Computação'],
  beneficio = 'Bolsa',
  duracao_em_meses = 12,
  publicada_em = now() - interval '1 day'
WHERE id = 2;

-- curso restrito: Carla Dias (Engenharia da Computação, 7º) atende o semestre,
-- mas e barrada pelo curso; Ana (5º) e barrada pelo semestre
UPDATE vaga SET
  descricao = 'Preparar e conduzir oficinas de leitura de dados com associações de bairro.',
  cursos_aceitos = ARRAY['Ciência da Computação', 'Estatística'],
  publicada_em = now() - interval '5 days'
WHERE id = 3;

UPDATE vaga SET
  descricao = 'Montar e testar os kits de eletrônica usados nas oficinas de robótica.',
  publicada_em = now() - interval '40 days'
WHERE id = 4;

UPDATE vaga SET
  descricao = 'Produzir conteúdo para as redes sociais e materiais de divulgação do projeto.',
  areas_tematicas = ARRAY['Saúde', 'Comunicação'],
  publicada_em = now() - interval '3 hours'
WHERE id = 5;

-- ---------------------------------------------------------------------------
-- Dupla A: candidaturas (Etapa 3)
-- ---------------------------------------------------------------------------

-- Toda candidatura tem pelo menos uma linha de historico (diagrama 1, 1..*):
-- a candidatura da Ana ja existia, entao a linha EM_ANALISE e criada aqui.
INSERT INTO historico_status (candidatura_id, status, ocorrido_em)
  SELECT id, status, criada_em FROM candidatura;

-- Uma candidatura ja aceita, para demonstrar o C07 sem passar pelo C11:
-- Bruno Lima (2o sem.) foi aprovado pelo Prof. Rui em Comunicacao e Divulgacao
-- (vaga sem semestre minimo) e pode confirmar ou declinar o ingresso.
-- As horas vem depois da publicacao da vaga (3 horas atras, no bloco da
-- frente C acima).
INSERT INTO candidatura (vaga_id, estudante_id, status, mensagem, criada_em) VALUES
  (5, 5, 'ACEITA',
   'Tenho experiência com edição de vídeo e redação para redes sociais.',
   now() - interval '2 hours');

-- Uma linha por comando: o historico e listado na ordem em que foi gravado.
INSERT INTO historico_status (candidatura_id, status, ocorrido_em)
  SELECT id, 'EM_ANALISE', now() - interval '2 hours'
    FROM candidatura WHERE vaga_id = 5 AND estudante_id = 5;
INSERT INTO historico_status (candidatura_id, status, ocorrido_em)
  SELECT id, 'ACEITA', now() - interval '1 hour'
    FROM candidatura WHERE vaga_id = 5 AND estudante_id = 5;

-- A posicao fica reservada enquanto a candidatura esta aceita.
UPDATE vaga SET vagas_restantes = vagas_restantes - 1 WHERE id = 5;

-- O aviso que o Bruno teria recebido no C11 (sino comeca com 1).
INSERT INTO notificacao (destinatario_id, tipo, texto, referencia_id, lida, criada_em)
  SELECT 5, 'RESULTADO_DA_AVALIACAO',
         'Sua candidatura à vaga "Comunicação e Divulgação" foi aceita. Confirme ou decline o ingresso no projeto Saúde Digital.',
         c.id, false, now() - interval '1 hour'
    FROM candidatura c
   WHERE c.vaga_id = 5 AND c.estudante_id = 5;
