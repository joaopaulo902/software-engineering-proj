// Tela "Candidaturas recebidas" do coordenador: C15 - Visualizar Candidaturas
// dos Aplicantes. Cada card leva a tela "Candidatura" (C11).

import { api } from '../servicos-api.js';
import { aviso, carregando, escapar, normalizar } from '../componentes/base.js';
import {
  cardDeCandidaturaRecebida,
  barraDeFiltro,
  ligarBarraDeFiltro
} from '../componentes/candidatura.js';

const STATUS_DO_FILTRO = ['EM_ANALISE', 'ACEITA', 'CONFIRMADA', 'RECUSADA', 'DECLINADA'];

export async function mostrar(conteudo, { consulta }) {
  // A primeira carga vem sem filtro: serve para saber se ha candidaturas e
  // para montar a lista de vagas do seletor.
  const todas = await api.candidaturasRecebidas();

  // Pre-condicao do C15: ter vaga publicada. Sem candidatura nenhuma, a tela
  // aponta o caminho.
  if (todas.length === 0) {
    conteudo.innerHTML = `
      <section class="vazio">
        <h2>Nenhuma candidatura recebida ainda</h2>
        <p>As candidaturas às vagas dos seus projetos aparecem aqui assim que forem enviadas.</p>
        <a class="botao botao--primario" href="#/vagas/nova">Ofertar nova vaga</a>
      </section>`;
    return;
  }

  const vagas = new Map();
  todas.forEach((c) => {
    if (c.vagaId) vagas.set(c.vagaId, c.vagaTitulo);
  });

  // Um link pode chegar ja filtrado: #/candidaturas/recebidas?vagaId=3
  const vagaInicial = Number(consulta.get('vagaId')) || null;

  conteudo.innerHTML = `
    ${barraDeFiltro({
      dica: 'Pesquisar por estudante ou vaga',
      statusDisponiveis: STATUS_DO_FILTRO,
      extra: `
        <select name="vagaId" aria-label="Filtrar por vaga">
          <option value="">Todas as vagas</option>
          ${[...vagas]
            .map(
              ([id, titulo]) =>
                `<option value="${id}" ${id === vagaInicial ? 'selected' : ''}>${escapar(titulo)}</option>`
            )
            .join('')}
        </select>`
    })}
    <p class="resumo" data-resumo></p>
    <div class="lista" data-lista></div>`;

  const lista = conteudo.querySelector('[data-lista]');
  const resumo = conteudo.querySelector('[data-resumo]');
  const seletorDeVaga = conteudo.querySelector('[name="vagaId"]');

  let filtradas = todas;
  let pedidoAtual = 0;

  // Vaga e status sao o FiltroDeCandidaturas e vao para o servidor.
  // O texto digitado filtra o que ja chegou, sem nova consulta.
  const lerFiltro = ligarBarraDeFiltro(conteudo, () => atualizar());
  let ultimoFiltroDoServidor = '';

  async function atualizar() {
    const { status } = lerFiltro();
    const vagaId = Number(seletorDeVaga.value) || null;
    const chave = JSON.stringify([vagaId, status]);

    if (chave !== ultimoFiltroDoServidor) {
      ultimoFiltroDoServidor = chave;
      const meuPedido = ++pedidoAtual;
      lista.innerHTML = carregando();
      try {
        const resposta = await api.candidaturasRecebidas({ vagaId, status });
        if (meuPedido !== pedidoAtual) return; // chegou uma resposta de um filtro antigo
        filtradas = resposta;
      } catch (erro) {
        if (meuPedido !== pedidoAtual) return;
        // Mantem o que o coordenador escolheu na barra; so a lista mostra o erro.
        ultimoFiltroDoServidor = '';
        resumo.textContent = '';
        lista.innerHTML = aviso(erro.message, 'erro');
        return;
      }
    }
    desenhar();
  }

  function desenhar() {
    const procurado = normalizar(lerFiltro().termo);
    const visiveis = filtradas.filter(
      (c) =>
        !procurado ||
        normalizar(`${c.estudante?.nome} ${c.vagaTitulo} ${c.projetoNome}`).includes(procurado)
    );

    const emAnalise = visiveis.filter((c) => c.status === 'EM_ANALISE').length;
    resumo.textContent =
      `${visiveis.length} ${visiveis.length === 1 ? 'candidatura' : 'candidaturas'}` +
      (emAnalise > 0 ? `, ${emAnalise} aguardando sua avaliação` : '');

    lista.innerHTML = visiveis.length
      ? visiveis.map(cardDeCandidaturaRecebida).join('')
      : aviso('Nenhuma candidatura com esses filtros.', 'info');
  }

  if (vagaInicial) await atualizar();
  else {
    ultimoFiltroDoServidor = JSON.stringify([null, []]);
    desenhar();
  }
}
