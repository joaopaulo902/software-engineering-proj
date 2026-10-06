// Pacote `servicos-api` do subsistema Cliente Web.
//
// Unico lugar do front que conhece os enderecos da API. Se uma rota mudar,
// muda aqui e em lugar nenhum mais.

const BASE = '/api';

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(BASE + caminho, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes
  });

  if (resposta.status === 204) return null;

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(corpo.erro || 'Erro inesperado.');
    erro.status = resposta.status;
    throw erro;
  }
  return corpo;
}

export const api = {
  listarUsuarios: () => pedir('/usuarios'),

  entrar: (usuarioId) =>
    pedir('/sessao', { method: 'POST', body: JSON.stringify({ usuarioId }) }),

  sessaoAtual: () => pedir('/sessao'),

  sair: () => pedir('/sessao', { method: 'DELETE' }),

  listarVagas: (termo, area) => {
    const parametros = new URLSearchParams();
    if (termo) parametros.set('termo', termo);
    if (area) parametros.set('area', area);
    const consulta = parametros.toString();
    return pedir('/vagas' + (consulta ? '?' + consulta : ''));
  },

  // C04
  candidatar: (vagaId, mensagem) =>
    pedir('/candidaturas', {
      method: 'POST',
      body: JSON.stringify({ vagaId, mensagem })
    }),

  // C05
  minhasCandidaturas: () => pedir('/candidaturas/minhas'),

  // C06
  meusProjetos: () => pedir('/projetos/meus'),

  publicarVaga: (dados) =>
    pedir('/vagas', { method: 'POST', body: JSON.stringify(dados) })
};
