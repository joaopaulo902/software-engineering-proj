// Pacote `servicos-api` do subsistema Cliente Web.
//
// Unico lugar do front que conhece os enderecos da API. Se uma rota mudar,
// muda aqui e em lugar nenhum mais. Os enderecos sao os da pagina 7 do
// diagrama de classes (camada de apresentacao).

import { criarExemploDeCandidaturas } from './exemplo/candidaturas.js';

const BASE = '/api';

/** Evento disparado quando o servidor diz que a sessao acabou (ver Aplicacao.jsx). */
export const SESSAO_EXPIRADA = 'connext:sessao-expirada';

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(BASE + caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...opcoes.headers }
  });

  if (resposta.status === 204) return null;

  const ehJson = (resposta.headers.get('content-type') ?? '').includes('application/json');
  const corpo = ehJson ? await resposta.json().catch(() => ({})) : {};

  if (!resposta.ok) {
    const erro = new Error(corpo.erro || 'Não foi possível concluir a operação.');
    erro.status = resposta.status;
    // Um 404 do tratadorDeErros vem em JSON ("Candidatura nao encontrada").
    // Um 404 sem JSON e o Express dizendo que a ROTA nao existe no servidor.
    erro.rotaInexistente = resposta.status === 404 && !ehJson;

    // 401 no meio do uso: a sessao acabou (o servidor foi reiniciado, por
    // exemplo). /sessao fica de fora: perguntar "quem esta logado?" e
    // receber 401 e o normal antes de entrar.
    if (resposta.status === 401 && caminho !== '/sessao') {
      window.dispatchEvent(new CustomEvent(SESSAO_EXPIRADA));
    }
    throw erro;
  }
  return corpo;
}

function comConsulta(caminho, parametros) {
  const consulta = parametros.toString();
  return caminho + (consulta ? '?' + consulta : '');
}

/**
 * Deixa uma candidatura no formato que as telas usam, venha ela "achatada"
 * (como o listarMinhas da Etapa 2 ja devolve) ou aninhada como os tipos de
 * dados do diagrama (CandidaturaComVaga, CandidaturaRecebida, DetalheDaCandidatura).
 *
 * Formato das telas:
 *   { id, status, mensagem, motivoDeclinio, criadaEm,
 *     vagaId, vagaTitulo, projetoId, projetoNome, coordenadorNome,
 *     estudante: { id, nome, curso, semestre },     // so nas recebidas
 *     historico: [{ status, ocorridoEm, observacao }] }  // so no detalhe
 */
function lerCandidatura(bruto) {
  if (!bruto) return bruto;

  // DetalheDaCandidatura = { candidatura: CandidaturaComVaga, historico }
  // CandidaturaComVaga   = { candidatura: Candidatura, vagaTitulo, ... }
  let plano = { ...bruto };
  while (plano.candidatura && typeof plano.candidatura === 'object') {
    const { candidatura, ...resto } = plano;
    plano = { ...candidatura, ...resto };
  }

  return {
    id: plano.id,
    status: plano.status,
    mensagem: plano.mensagem ?? null,
    motivoDeclinio: plano.motivoDeclinio ?? null,
    criadaEm: plano.criadaEm,
    vagaId: plano.vagaId ?? null,
    vagaTitulo: plano.vagaTitulo ?? '',
    projetoId: plano.projetoId ?? null,
    projetoNome: plano.projetoNome ?? '',
    coordenadorNome: plano.coordenadorNome ?? '',
    estudante: plano.estudante ?? null,
    historico: Array.isArray(plano.historico) ? plano.historico : null
  };
}

// ---------------------------------------------------------------------------
// DADOS DE EXEMPLO (provisorio)
//
// Quando o servidor responde "rota inexistente" a uma rota de candidatura, a
// chamada e atendida por dados de exemplo que vivem no navegador. Cada rota
// passa a valer de verdade, sozinha, quando o servidor comecar a responde-la.
//
// Para remover: apagar a pasta `exemplo/`, este bloco e as chamadas a
// `exemplo` e `ouExemplo` mais abaixo.
const exemplo = criarExemploDeCandidaturas({
  sessaoAtual: () => pedir('/sessao'),
  candidaturasReais: async () => (await pedir('/candidaturas/minhas')).map(lerCandidatura),
  // Equipes em que o estudante esta hoje. Na lista vem tambem os projetos
  // que o usuario coordena (coordenador: true), que nao contam aqui.
  participacoesAtivas: async () =>
    (await pedir('/participacoes/minhas')).filter((p) => p.ativa && !p.coordenador),
  aoUsar: () => window.dispatchEvent(new CustomEvent('connext:dados-de-exemplo'))
});

async function ouExemplo(pedido, substituto) {
  try {
    return await pedido();
  } catch (erro) {
    if (!erro.rotaInexistente) throw erro;
    return substituto();
  }
}

/** As rotas novas existem no servidor? Pergunta uma vez por carga de pagina. */
let sondagem = null;
function servidorSemAsRotasNovas() {
  sondagem ??= pedir('/candidaturas/recebidas').then(
    () => false,
    (erro) => erro.rotaInexistente === true
  );
  return sondagem;
}
// ---------------------------------------------------------------------------

export const api = {
  // ------------------------------------------------------------------ sessao
  listarUsuarios: () => pedir('/usuarios'),

  entrar: (usuarioId) =>
    pedir('/sessao', { method: 'POST', body: JSON.stringify({ usuarioId }) }),

  sessaoAtual: () => pedir('/sessao'),

  sair: () => pedir('/sessao', { method: 'DELETE' }),

  // ---------------------------------------------------------- frente C · vagas
  // C01 - GET /api/vagas com os filtros (FiltroDeVagas no diagrama).
  // Listas vao separadas por virgula: ?turnos=Manhã,Noite
  vagas: async (filtro = {}) => {
    const parametros = new URLSearchParams();
    if (filtro.termo?.trim()) parametros.set('termo', filtro.termo.trim());
    for (const chave of ['areas', 'turnos', 'modalidades']) {
      if (filtro[chave]?.length) parametros.set(chave, filtro[chave].join(','));
    }
    if (filtro.cargaHorariaMaxima) parametros.set('cargaHorariaMaxima', String(filtro.cargaHorariaMaxima));
    if (filtro.ordenarPor) parametros.set('ordenarPor', filtro.ordenarPor);
    const vagas = await pedir(comConsulta('/vagas', parametros));
    exemplo.lembrarVagas(vagas);
    return vagas;
  },

  // C03 - a vaga, mais podeSeCandidatar e motivoDeInelegibilidade de quem esta logado
  vaga: (id) => pedir(`/vagas/${encodeURIComponent(id)}`),

  // C06 - os projetos em que o coordenador pode publicar (so os ativos) e a publicacao
  projetosParaPublicar: () => pedir('/projetos/meus'),

  publicarVaga: (dados) =>
    pedir('/vagas', { method: 'POST', body: JSON.stringify(dados) }),

  // ------------------------------------------------- frente C · perfil (C16)
  // O e-mail vem null quando quem esta vendo nao pode ve-lo.
  perfil: (usuarioId) => pedir(`/usuarios/${encodeURIComponent(usuarioId)}/perfil`),

  // Configuracoes: devolve o perfil salvo, no mesmo formato de `perfil`.
  atualizarPerfil: (dados) =>
    pedir('/perfil', { method: 'PUT', body: JSON.stringify(dados) }),

  // ------------------------------------------- dupla B · projetos e atividades
  projetos: (filtros = {}) => {
    const parametros = new URLSearchParams();
    if (filtros.termo) parametros.set('termo', filtros.termo);
    if (filtros.areas) parametros.set('areas', filtros.areas);
    if (filtros.somenteVagas) parametros.set('somenteComVagasAbertas', 'true');
    return pedir(comConsulta('/projetos', parametros));
  },

  projeto: (id) => pedir(`/projetos/${encodeURIComponent(id)}`),

  participantes: (id) => pedir(`/projetos/${encodeURIComponent(id)}/participantes`),

  // Meus Projetos: participacoes do usuario e projetos que ele coordena
  meusProjetos: () => pedir('/participacoes/minhas'),

  atividades: () => pedir('/atividades'),

  postarAtividade: (projetoId, dados) =>
    pedir(`/projetos/${encodeURIComponent(projetoId)}/atividades`, {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  alterarCargo: (participacaoId, cargo) =>
    pedir(`/participacoes/${participacaoId}`, { method: 'PATCH', body: JSON.stringify({ cargo }) }),

  removerParticipante: (participacaoId) =>
    pedir(`/participacoes/${participacaoId}`, { method: 'DELETE' }),

  // ------------------------------------------------ C17 · incorporacao
  projetosParaIncorporar: (termo = '') => {
    const parametros = new URLSearchParams();
    if (termo.trim()) parametros.set('termo', termo.trim());
    return pedir(comConsulta('/base-institucional/projetos', parametros));
  },

  solicitarIncorporacao: (projetoId, mensagem) =>
    pedir('/incorporacoes', { method: 'POST', body: JSON.stringify({ projetoId, mensagem }) }),

  minhasIncorporacoesPendentes: () => pedir('/incorporacoes/minhas'),

  incorporacoesPendentes: () => pedir('/incorporacoes/pendentes'),

  avaliarIncorporacao: (pedidoId, decisao) =>
    pedir(`/incorporacoes/${pedidoId}/avaliacao`, {
      method: 'POST',
      body: JSON.stringify({ decisao })
    }),

  // ------------------------------------------------ notificacoes
  notificacoes: () => pedir('/notificacoes'),

  marcarNotificacoesLidas: () => pedir('/notificacoes/lidas', { method: 'POST' }),

  // Contador do sino: quantos avisos ainda nao foram lidos.
  notificacoesNaoLidas: async () =>
    (await pedir('/notificacoes')).filter((n) => !n.lida).length,

  // ------------------------------------------------- dupla A · candidaturas
  // C04 - POST /api/candidaturas
  candidatar: async (vagaId, mensagem) => {
    const texto = mensagem?.trim() || null;
    const criada = await pedir('/candidaturas', {
      method: 'POST',
      body: JSON.stringify({ vagaId, mensagem: texto })
    });
    if (await servidorSemAsRotasNovas()) await exemplo.registrarNova(criada, vagaId, texto);
    return criada;
  },

  // C05 - GET /api/candidaturas/minhas
  minhasCandidaturas: async () => {
    const lista = (await pedir('/candidaturas/minhas')).map(lerCandidatura);
    return (await servidorSemAsRotasNovas()) ? exemplo.minhas(lista) : lista;
  },

  // C05 - GET /api/candidaturas/:id  (candidatura + historico do processo)
  detalharCandidatura: (id) =>
    ouExemplo(
      async () => lerCandidatura(await pedir(`/candidaturas/${id}`)),
      () => exemplo.detalhar(id)
    ),

  // C18 - DELETE /api/candidaturas/:id
  removerCandidatura: (id) =>
    ouExemplo(
      () => pedir(`/candidaturas/${id}`, { method: 'DELETE' }),
      () => exemplo.remover(id)
    ),

  // C07 - POST /api/candidaturas/:id/confirmacao
  confirmarIngresso: (id) =>
    ouExemplo(
      () => pedir(`/candidaturas/${id}/confirmacao`, { method: 'POST' }),
      () => exemplo.confirmar(id)
    ),

  // C07 (fluxo 2.a) - POST /api/candidaturas/:id/declinio   corpo: { motivo }
  declinarIngresso: (id, motivo) =>
    ouExemplo(
      () =>
        pedir(`/candidaturas/${id}/declinio`, {
          method: 'POST',
          body: JSON.stringify({ motivo: motivo || null })
        }),
      () => exemplo.declinar(id, motivo)
    ),

  // C15 - GET /api/candidaturas/recebidas?vagaId=1&status=EM_ANALISE&status=ACEITA
  // Os parametros sao o FiltroDeCandidaturas do diagrama; `status` se repete,
  // um por valor, que e como o Express monta uma lista.
  candidaturasRecebidas: ({ vagaId = null, status = [] } = {}) => {
    const parametros = new URLSearchParams();
    if (vagaId) parametros.set('vagaId', String(vagaId));
    status.forEach((s) => parametros.append('status', s));
    return ouExemplo(
      async () =>
        (await pedir(comConsulta('/candidaturas/recebidas', parametros))).map(lerCandidatura),
      () => exemplo.recebidas({ vagaId, status })
    );
  },

  // C15 - GET /api/candidaturas/recebidas/:id
  detalharCandidaturaRecebida: (id) =>
    ouExemplo(
      async () => lerCandidatura(await pedir(`/candidaturas/recebidas/${id}`)),
      () => exemplo.detalharRecebida(id)
    ),

  // C11 - POST /api/candidaturas/:id/avaliacao   corpo: { decisao: 'ACEITAR' | 'RECUSAR' }
  avaliarCandidatura: (id, decisao) =>
    ouExemplo(
      () =>
        pedir(`/candidaturas/${id}/avaliacao`, {
          method: 'POST',
          body: JSON.stringify({ decisao })
        }),
      () => exemplo.avaliar(id, decisao)
    )
};
