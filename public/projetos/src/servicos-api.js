async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.erro || 'Não foi possível concluir a operação.');
  return body;
}

export const api = {
  sessao: () => request('/api/sessao'),
  projetos: (filtros) => {
    const parametros = new URLSearchParams();
    if (filtros.termo) parametros.set('termo', filtros.termo);
    if (filtros.areas) parametros.set('areas', filtros.areas);
    if (filtros.somenteVagas) parametros.set('somenteComVagasAbertas', 'true');
    const consulta = parametros.toString();
    return request(`/api/projetos${consulta ? `?${consulta}` : ''}`);
  },
  projeto: (id) => request(`/api/projetos/${id}`),
  projetosParaIncorporar: (termo = '') => {
    const parametros = new URLSearchParams();
    if (termo.trim()) parametros.set('termo', termo.trim());
    const consulta = parametros.toString();
    return request(`/api/base-institucional/projetos${consulta ? `?${consulta}` : ''}`);
  },
  solicitarIncorporacao: (projetoId, mensagem) => request('/api/incorporacoes', {
    method: 'POST',
    body: JSON.stringify({ projetoId, mensagem })
  }),
  minhasIncorporacoesPendentes: () => request('/api/incorporacoes/minhas'),
  incorporacoesPendentes: () => request('/api/incorporacoes/pendentes'),
  avaliarIncorporacao: (pedidoId, decisao) => request(`/api/incorporacoes/${pedidoId}/avaliacao`, {
    method: 'POST',
    body: JSON.stringify({ decisao })
  }),
  participantes: (id) => request(`/api/projetos/${id}/participantes`),
  meusProjetos: () => request('/api/participacoes/minhas'),
  atividades: () => request('/api/atividades'),
  postarAtividade: (projetoId, dados) => request(`/api/projetos/${projetoId}/atividades`, {
    method: 'POST',
    body: JSON.stringify(dados)
  }),
  alterarCargo: (participacaoId, cargo) => request(`/api/participacoes/${participacaoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ cargo })
  }),
  removerParticipante: (participacaoId) => request(`/api/participacoes/${participacaoId}`, {
    method: 'DELETE'
  }),
};
