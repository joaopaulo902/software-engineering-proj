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
