async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const erro = new Error(body.erro || 'Não foi possível concluir a operação.');
    erro.status = response.status; // 401 = sessao expirada (ver vagas.js)
    throw erro;
  }
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

  // ------------------------------------------------------- frente C · vagas
  // C01 - GET /api/vagas com os filtros (FiltroDeVagas no diagrama).
  // Listas vao separadas por virgula: ?turnos=Manhã,Noite
  vagas: (filtro = {}) => {
    const parametros = new URLSearchParams();
    if (filtro.termo?.trim()) parametros.set('termo', filtro.termo.trim());
    for (const chave of ['areas', 'turnos', 'modalidades']) {
      if (filtro[chave]?.length) parametros.set(chave, filtro[chave].join(','));
    }
    if (filtro.cargaHorariaMaxima) parametros.set('cargaHorariaMaxima', String(filtro.cargaHorariaMaxima));
    if (filtro.ordenarPor) parametros.set('ordenarPor', filtro.ordenarPor);
    const consulta = parametros.toString();
    return request(`/api/vagas${consulta ? `?${consulta}` : ''}`);
  },
  // C03 - a vaga, mais podeSeCandidatar e motivoDeInelegibilidade de quem esta logado
  vaga: (id) => request(`/api/vagas/${encodeURIComponent(id)}`),
  // C04 - candidatar-se
  candidatar: (vagaId, mensagem) => request('/api/candidaturas', {
    method: 'POST',
    body: JSON.stringify({ vagaId, mensagem: mensagem?.trim() || null })
  }),
  // C06 - os projetos em que o coordenador pode publicar (so os ativos) e a publicacao
  projetosParaPublicar: () => request('/api/projetos/meus'),
  publicarVaga: (dados) => request('/api/vagas', {
    method: 'POST',
    body: JSON.stringify(dados)
  }),
};
