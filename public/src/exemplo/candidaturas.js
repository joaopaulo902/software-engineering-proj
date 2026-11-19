// DADOS DE EXEMPLO das rotas de candidatura que o servidor ainda nao tem
// (C05 detalhe, C07, C11, C15 e C18). PROVISORIO: sai quando o back da
// dupla A entrar na main. Nada aqui e regra de negocio de verdade; as
// conferencias abaixo so imitam as respostas que o servidor vai dar, para as
// telas poderem ser feitas e demonstradas antes.
//
// Como funciona:
//   - As candidaturas de exemplo usam os usuarios, as vagas e as participacoes
//     do seed (db/02-seed.sql), com ids a partir de 9001 para nao colidir com
//     os reais. A candidatura 1 do seed (Ana na Monitoria) tambem ja vem aqui,
//     porque a notificacao do seed para a Profa. Carla aponta para ela.
//   - As candidaturas REAIS do estudante (gravadas pelo C04) tambem entram
//     aqui quando ele abre "Minhas candidaturas" ou se candidata, para que
//     remover, aprovar e confirmar funcionem nelas tambem.
//   - Tudo fica guardado nesta aba do navegador (sessionStorage): trocar de
//     usuario e recarregar a pagina mantem; fechar a aba zera.
//
// Roteiro que da para demonstrar so com isto:
//   Diego se candidata -> Profa. Carla aprova -> Diego confirma o ingresso.

// O sufixo muda quando os dados iniciais mudam, para uma aba aberta antes
// nao continuar com a versao antiga guardada.
const CHAVE = 'connext.exemplo.candidaturas.v2';
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

function erro(status, mensagem) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

export function criarExemploDeCandidaturas({
  sessaoAtual,
  candidaturasReais,
  participacoesAtivas,
  aoUsar
}) {
  /** id -> candidatura de exemplo */
  let registros = null;
  /** id -> vaga, do que o front ja viu passar em "Vagas abertas" */
  const vagasVistas = new Map();

  function banco() {
    if (registros) return registros;
    try {
      const guardado = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null');
      if (Array.isArray(guardado)) registros = new Map(guardado.map((r) => [r.id, r]));
    } catch {
      // Sem armazenamento ou com conteudo ilegivel: comeca do zero.
    }
    registros ??= new Map(montarIniciais().map((r) => [r.id, r]));
    return registros;
  }

  function salvar() {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify([...banco().values()]));
    } catch {
      // Sem armazenamento: os dados de exemplo valem so ate recarregar.
    }
  }

  // ------------------------------------------------------------ formatos
  function paraEstudante(r, comHistorico = false) {
    return {
      id: r.id,
      status: r.status,
      mensagem: r.mensagem,
      motivoDeclinio: r.motivoDeclinio ?? null,
      criadaEm: r.criadaEm,
      vagaId: r.vaga.id ?? null,
      vagaTitulo: r.vaga.titulo,
      projetoId: r.vaga.projetoId ?? null,
      projetoNome: r.vaga.projetoNome,
      coordenadorNome: r.vaga.coordenadorNome ?? '',
      estudante: null,
      historico: comHistorico ? r.historico.map((h) => ({ ...h })) : null
    };
  }

  function paraCoordenador(r, comHistorico = false) {
    return { ...paraEstudante(r, comHistorico), estudante: { ...r.estudante } };
  }

  function mudarStatus(r, status, observacao = null) {
    r.status = status;
    r.historico.push({ status, ocorridoEm: new Date().toISOString(), observacao });
    salvar();
  }

  // ------------------------------------------------------- quem pede o que
  async function doEstudante(id) {
    const usuario = await sessaoAtual();
    if (!banco().has(Number(id))) {
      // Pode ser uma candidatura real que ainda nao passou por aqui
      // (a tela foi aberta direto pelo endereco).
      sincronizar(await candidaturasReais(), usuario);
    }
    const r = banco().get(Number(id));
    if (!r || r.estudante.id !== usuario.id) throw erro(404, 'Candidatura não encontrada.');
    return r;
  }

  async function doCoordenador(id) {
    const usuario = await sessaoAtual();
    if (usuario.papel !== 'COORDENADOR') {
      throw erro(403, 'Apenas coordenadores veem as candidaturas recebidas.');
    }
    const r = banco().get(Number(id));
    if (!r || r.vaga.coordenadorNome !== usuario.nome) {
      throw erro(404, 'Candidatura não encontrada.');
    }
    return r;
  }

  /**
   * Imita o indice uq_participacao_ativa do esquema: no maximo uma
   * participacao ativa por pessoa em cada projeto. Vale a equipe real
   * (GET /api/participacoes/minhas) e o que ja foi confirmado aqui.
   */
  async function jaEstaNaEquipe(r) {
    const mesmoProjeto = (p) =>
      (r.vaga.projetoId != null && p.projetoId === r.vaga.projetoId) ||
      p.projetoNome === r.vaga.projetoNome;

    const ativas = await participacoesAtivas();
    if (ativas.some(mesmoProjeto)) return true;

    return [...banco().values()].some(
      (outra) =>
        outra.id !== r.id &&
        outra.estudante.id === r.estudante.id &&
        outra.status === 'CONFIRMADA' &&
        outra.vaga.projetoNome === r.vaga.projetoNome
    );
  }

  /**
   * Acerta as candidaturas reais do estudante com o que o servidor diz agora.
   * Importa quando o banco em memoria do servidor e reiniciado e esta aba
   * continua aberta: os ids recomecam e passam a ser de outras candidaturas.
   */
  function sincronizar(reais, estudante) {
    const ids = new Set(reais.map((real) => real.id));
    for (const r of [...banco().values()]) {
      if (r.real && r.estudante.id === estudante.id && !ids.has(r.id)) banco().delete(r.id);
    }
    reais.forEach((real) => adotar(real, estudante));
    salvar();
  }

  /** Traz para ca uma candidatura real, na primeira vez que ela aparece. */
  function adotar(real, estudante) {
    const atual = banco().get(real.id);
    const aMesma =
      atual?.real &&
      atual.estudante.id === estudante.id &&
      (!real.vagaTitulo || atual.vaga.titulo === real.vagaTitulo);
    if (aMesma) return;

    // UNIQUE (vaga_id, estudante_id): se o estudante se candidatou de verdade
    // a uma vaga em que ja tinha candidatura de exemplo, fica so a real.
    for (const r of [...banco().values()]) {
      if (!r.real && r.estudante.id === estudante.id && r.vaga.titulo === real.vagaTitulo) {
        banco().delete(r.id);
      }
    }

    const vista = real.vagaId ? vagasVistas.get(real.vagaId) : null;
    const pelaLista = [...vagasVistas.values()].find(
      (v) => v.titulo === real.vagaTitulo && v.projetoNome === real.projetoNome
    );
    const vaga = vista ?? pelaLista ?? {};

    const historico = [{ status: 'EM_ANALISE', ocorridoEm: real.criadaEm, observacao: null }];
    if (real.status !== 'EM_ANALISE') {
      historico.push({ status: real.status, ocorridoEm: real.criadaEm, observacao: null });
    }

    banco().set(real.id, {
      id: real.id,
      real: true,
      estudante: {
        id: estudante.id,
        nome: estudante.nome,
        curso: estudante.curso,
        semestre: estudante.semestre
      },
      vaga: {
        id: real.vagaId ?? vaga.id ?? null,
        titulo: real.vagaTitulo || vaga.titulo || 'Vaga',
        projetoId: real.projetoId ?? null,
        projetoNome: real.projetoNome || vaga.projetoNome || '',
        coordenadorNome: real.coordenadorNome || vaga.coordenadorNome || ''
      },
      status: real.status,
      mensagem: real.mensagem ?? null,
      motivoDeclinio: null,
      criadaEm: real.criadaEm,
      historico
    });
  }

  return {
    /** Guarda as vagas que passaram pela tela, para saber de quem e cada candidatura real. */
    lembrarVagas(vagas) {
      for (const v of vagas ?? []) {
        vagasVistas.set(v.id, {
          id: v.id,
          titulo: v.titulo,
          projetoNome: v.projetoNome,
          coordenadorNome: v.coordenadorNome
        });
      }
    },

    /** O C04 de verdade acabou de gravar: a candidatura entra na caixa do coordenador. */
    async registrarNova(criada, vagaId, mensagem) {
      const estudante = await sessaoAtual();
      const vaga = vagasVistas.get(vagaId);
      adotar(
        {
          id: criada.id,
          status: criada.status ?? 'EM_ANALISE',
          mensagem: (mensagem ?? '').trim() || null,
          criadaEm: criada.criadaEm ?? new Date().toISOString(),
          vagaId,
          vagaTitulo: vaga?.titulo,
          projetoNome: vaga?.projetoNome,
          coordenadorNome: vaga?.coordenadorNome
        },
        estudante
      );
      salvar();
    },

    /** GET /candidaturas/minhas: as reais (com o que mudou aqui) mais as de exemplo. */
    async minhas(reais) {
      aoUsar();
      const estudante = await sessaoAtual();
      sincronizar(reais, estudante);

      return [...banco().values()]
        .filter((r) => r.estudante.id === estudante.id)
        .sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm))
        .map((r) => paraEstudante(r));
    },

    /** GET /candidaturas/:id */
    async detalhar(id) {
      aoUsar();
      return paraEstudante(await doEstudante(id), true);
    },

    /** DELETE /candidaturas/:id (C18) */
    async remover(id) {
      aoUsar();
      const r = await doEstudante(id);
      if (r.status !== 'EM_ANALISE') {
        throw erro(409, 'Só é possível remover uma candidatura que ainda está em análise.');
      }
      mudarStatus(r, 'REMOVIDA');
      return null;
    },

    /** POST /candidaturas/:id/confirmacao (C07) */
    async confirmar(id) {
      aoUsar();
      const r = await doEstudante(id);
      if (r.status !== 'ACEITA') {
        throw erro(409, 'Só é possível confirmar o ingresso de uma candidatura aceita.');
      }
      if (await jaEstaNaEquipe(r)) {
        throw erro(409, `Você já faz parte da equipe do projeto ${r.vaga.projetoNome}.`);
      }
      mudarStatus(r, 'CONFIRMADA');
      return null;
    },

    /** POST /candidaturas/:id/declinio (C07, fluxo 2.a) */
    async declinar(id, motivo) {
      aoUsar();
      const r = await doEstudante(id);
      if (r.status !== 'ACEITA') {
        throw erro(409, 'Só é possível declinar o ingresso de uma candidatura aceita.');
      }
      r.motivoDeclinio = (motivo ?? '').trim() || null;
      mudarStatus(r, 'DECLINADA', r.motivoDeclinio);
      return null;
    },

    /** GET /candidaturas/recebidas (C15) */
    async recebidas({ vagaId = null, status = [] } = {}) {
      aoUsar();
      const usuario = await sessaoAtual();
      if (usuario.papel !== 'COORDENADOR') {
        throw erro(403, 'Apenas coordenadores veem as candidaturas recebidas.');
      }

      return [...banco().values()]
        .filter((r) => r.vaga.coordenadorNome === usuario.nome)
        // Removida pelo estudante: sai da caixa do coordenador.
        .filter((r) => r.status !== 'REMOVIDA')
        .filter((r) => !vagaId || r.vaga.id === Number(vagaId))
        .filter((r) => status.length === 0 || status.includes(r.status))
        .sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm))
        .map((r) => paraCoordenador(r));
    },

    /** GET /candidaturas/recebidas/:id (C15) */
    async detalharRecebida(id) {
      aoUsar();
      return paraCoordenador(await doCoordenador(id), true);
    },

    /** POST /candidaturas/:id/avaliacao (C11) */
    async avaliar(id, decisao) {
      aoUsar();
      const r = await doCoordenador(id);
      if (r.status !== 'EM_ANALISE') {
        throw erro(409, 'Esta candidatura já foi avaliada.');
      }
      if (decisao !== 'ACEITAR' && decisao !== 'RECUSAR') {
        throw erro(400, 'Informe a decisão: ACEITAR ou RECUSAR.');
      }
      mudarStatus(r, decisao === 'ACEITAR' ? 'ACEITA' : 'RECUSADA');
      return paraCoordenador(r, true);
    }
  };
}

// ---------------------------------------------------------------- dados
// Usuarios, projetos e vagas abaixo sao os do db/02-seed.sql.

const ANA = { id: 4, nome: 'Ana Souza', curso: 'Ciência da Computação', semestre: 5 };
const BRUNO = { id: 5, nome: 'Bruno Lima', curso: 'Ciência da Computação', semestre: 2 };
const CARLA = { id: 6, nome: 'Carla Dias', curso: 'Engenharia da Computação', semestre: 7 };
const DIEGO = { id: 7, nome: 'Diego Alves', curso: 'Ciência da Computação', semestre: 4 };

const PROFA_CARLA = 'Profa. Carla Menezes';
const PROF_RUI = 'Prof. Rui Bastos';

// Horario da notificacao do seed sobre a candidatura 1 (2026-11-10 09:00-03).
const SEED_CANDIDATURA_1 = '2026-11-10T12:00:00.000Z';

const VAGA = {
  algoritmos: { id: 1, titulo: 'Monitoria de Algoritmos', projetoId: 1, projetoNome: 'Robótica na Escola', coordenadorNome: PROFA_CARLA },
  web: { id: 2, titulo: 'Desenvolvimento Web', projetoId: 2, projetoNome: 'Saúde Digital', coordenadorNome: PROF_RUI },
  dados: { id: 3, titulo: 'Oficina de Dados', projetoId: 3, projetoNome: 'Dados para Todos', coordenadorNome: PROFA_CARLA },
  eletronica: { id: 4, titulo: 'Apoio em Eletrônica', projetoId: 1, projetoNome: 'Robótica na Escola', coordenadorNome: PROFA_CARLA },
  divulgacao: { id: 5, titulo: 'Comunicação e Divulgação', projetoId: 2, projetoNome: 'Saúde Digital', coordenadorNome: PROF_RUI }
};

function montarIniciais() {
  const agora = Date.now();
  const ha = (ms) => new Date(agora - ms).toISOString();

  /** passos: [[status, ha quanto tempo, observacao?], ...] do mais antigo para o mais novo */
  const candidatura = (id, estudante, vaga, mensagem, passos) => ({
    id,
    estudante: { ...estudante },
    vaga: { ...vaga },
    status: passos[passos.length - 1][0],
    mensagem,
    motivoDeclinio: passos[passos.length - 1][0] === 'DECLINADA' ? passos[passos.length - 1][2] ?? null : null,
    criadaEm: ha(passos[0][1]),
    historico: passos.map(([status, quando, observacao = null]) => ({
      status,
      ocorridoEm: ha(quando),
      observacao
    }))
  });

  return [
    // Espelho da candidatura que o 02-seed.sql ja grava (id 1). Vem pronta
    // para a notificacao "Ana Souza se candidatou..." da Profa. Carla abrir
    // a tela certa, mesmo antes de a Ana entrar nesta aba.
    { ...candidatura(1, ANA, VAGA.algoritmos,
        'Tenho interesse em atuar com ensino de algoritmos.',
        [['EM_ANALISE', 0]]),
      real: true,
      criadaEm: SEED_CANDIDATURA_1,
      historico: [{ status: 'EM_ANALISE', ocorridoEm: SEED_CANDIDATURA_1, observacao: null }] },

    // Diego pode confirmar ou declinar o ingresso (C07). Ele nao participa
    // de nenhum projeto no seed, entao confirmar e permitido.
    candidatura(9001, DIEGO, VAGA.divulgacao,
      'Cuido das redes do diretório acadêmico há um ano e queria aplicar isso num projeto de saúde.',
      [['EM_ANALISE', 6 * DIA], ['ACEITA', 1 * DIA + 3 * HORA]]),

    // Ana ve uma candidatura encerrada, sem acoes. A vaga fechou em 15/09.
    candidatura(9002, ANA, VAGA.eletronica,
      'Fiz a oficina de Arduino do semestre passado.',
      [['EM_ANALISE', 70 * DIA], ['RECUSADA', 64 * DIA]]),

    // A Profa. Carla pode aprovar ou recusar estas duas (C11).
    // Carla Dias (7º sem.) atende o semestre minimo da Oficina de Dados (6º).
    candidatura(9003, CARLA, VAGA.dados,
      'Uso pandas no estágio e gostaria de ensinar o que aprendi para as associações de bairro.',
      [['EM_ANALISE', 2 * DIA]]),
    candidatura(9004, BRUNO, VAGA.eletronica,
      null,
      [['EM_ANALISE', 75 * DIA]]),

    // O Prof. Rui pode avaliar a do Bruno.
    candidatura(9005, BRUNO, VAGA.divulgacao,
      'Tenho experiência com edição de vídeo e redação para redes sociais.',
      [['EM_ANALISE', 3 * DIA]]),

    // Status final de declinio. A vaga Desenvolvimento Web continua com 1 de 1
    // no seed, o que bate: so o ingresso confirmado ocupa posicao.
    candidatura(9007, CARLA, VAGA.web,
      'Trabalhei com JavaScript e PostgreSQL na disciplina de Banco de Dados.',
      [['EM_ANALISE', 12 * DIA], ['ACEITA', 9 * DIA], ['DECLINADA', 8 * DIA, 'Consegui uma bolsa de iniciação científica no mesmo turno.']])

    // Nao ha exemplo CONFIRMADA de proposito: toda candidatura confirmada
    // gera uma participacao, e as participacoes do seed (Carla Dias na
    // Robotica, Ana na Saude Digital) nao vieram de candidatura. Para ver o
    // status, siga o roteiro do topo do arquivo.
  ];
}
