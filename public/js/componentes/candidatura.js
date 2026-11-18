// Pacote `componentes` do subsistema Cliente Web.
// Componentes das telas de candidatura (C05, C07, C11, C15 e C18).

import { escapar, diaBr, dataHoraBr, iniciais } from './base.js';

/**
 * Nomes dos status na interface. As chaves sao as do enum StatusCandidatura
 * do diagrama de classes (pagina 1).
 *
 * CANCELADA e o nome que o banco da Etapa 2 ainda usa; sai daqui quando o
 * esquema passar a gravar DECLINADA e REMOVIDA.
 */
export const ROTULO_STATUS = {
  EM_ANALISE: 'Em análise',
  ACEITA: 'Aguardando confirmação',
  RECUSADA: 'Recusada',
  CONFIRMADA: 'Confirmada',
  DECLINADA: 'Vaga declinada',
  REMOVIDA: 'Removida',
  CANCELADA: 'Cancelada'
};

/** O mesmo status, dito como um acontecimento, para o historico do processo. */
const ROTULO_NO_HISTORICO = {
  EM_ANALISE: 'Candidatura enviada, em análise',
  ACEITA: 'Aceita pela coordenação',
  RECUSADA: 'Recusada pela coordenação',
  CONFIRMADA: 'Ingresso confirmado',
  DECLINADA: 'Vaga declinada',
  REMOVIDA: 'Candidatura removida',
  CANCELADA: 'Candidatura cancelada'
};

export function etiquetaStatus(status) {
  return `<span class="etiqueta etiqueta--${escapar(String(status).toLowerCase())}">${
    escapar(ROTULO_STATUS[status] ?? status)
  }</span>`;
}

/** Card de "Minhas candidaturas" (C05). O card inteiro leva a Minha Candidatura. */
export function cardDeCandidatura(item) {
  return `
    <a class="card card--compacto card--link" href="#/candidaturas/${item.id}">
      <header class="card__topo">
        <div>
          <h3>${escapar(item.vagaTitulo)}</h3>
          <p class="card__projeto">${escapar(item.projetoNome)}</p>
        </div>
        ${etiquetaStatus(item.status)}
      </header>
      <p class="card__coordenador">
        ${item.coordenadorNome ? `Coordenação: ${escapar(item.coordenadorNome)} &middot; ` : ''}
        Enviada em ${diaBr(item.criadaEm)}
      </p>
    </a>`;
}

/** Card de "Candidaturas recebidas" (C15). Leva a Candidatura do coordenador. */
export function cardDeCandidaturaRecebida(item) {
  const estudante = item.estudante ?? {};
  return `
    <a class="card card--compacto card--link" href="#/candidaturas/recebidas/${item.id}">
      <header class="card__topo">
        <div class="pessoa">
          <span class="avatar" aria-hidden="true">${escapar(iniciais(estudante.nome))}</span>
          <div>
            <h3>${escapar(estudante.nome)}</h3>
            <p class="card__projeto">${escapar(descricaoDoEstudante(estudante))}</p>
          </div>
        </div>
        ${etiquetaStatus(item.status)}
      </header>
      <p class="card__coordenador">
        ${escapar(item.vagaTitulo)}${item.projetoNome ? ` &middot; ${escapar(item.projetoNome)}` : ''}
        &middot; Recebida em ${diaBr(item.criadaEm)}
      </p>
    </a>`;
}

/** "Ciencia da Computacao, 5º semestre", com o que houver. */
export function descricaoDoEstudante(estudante) {
  return [estudante.curso, estudante.semestre ? `${estudante.semestre}º semestre` : null]
    .filter(Boolean)
    .join(', ');
}

/**
 * Historico do processo: uma linha do tempo, do mais antigo para o mais novo.
 * O ultimo ponto e o status atual e por isso vem preenchido.
 */
export function linhaDoTempo(historico) {
  if (!historico || historico.length === 0) return '';

  const ordenado = [...historico].sort(
    (a, b) => new Date(a.ocorridoEm).getTime() - new Date(b.ocorridoEm).getTime()
  );

  return `
    <ol class="historico">
      ${ordenado
        .map((passo, indice) => {
          const atual = indice === ordenado.length - 1;
          return `
            <li class="historico__passo ${atual ? `historico__passo--atual historico__passo--${escapar(String(passo.status).toLowerCase())}` : ''}">
              <span class="historico__titulo">${escapar(ROTULO_NO_HISTORICO[passo.status] ?? passo.status)}</span>
              <time class="historico__quando" datetime="${escapar(new Date(passo.ocorridoEm).toISOString())}">
                ${dataHoraBr(passo.ocorridoEm)}
              </time>
              ${passo.observacao ? `<p class="historico__nota">“${escapar(passo.observacao)}”</p>` : ''}
            </li>`;
        })
        .join('')}
    </ol>`;
}

/**
 * Barra de busca das listas de candidatura: campo de texto e os status como
 * botoes de liga/desliga (o filtro aceita varios status, como o
 * FiltroDeCandidaturas do diagrama). `extra` e HTML que entra entre os dois.
 */
export function barraDeFiltro({ dica, statusDisponiveis, extra = '' }) {
  return `
    <form class="filtro" data-filtro role="search">
      <div class="filtro__linha">
        <input type="search" name="termo" placeholder="${escapar(dica)}" aria-label="${escapar(dica)}">
        ${extra}
      </div>
      <div class="filtro__status" role="group" aria-label="Filtrar por status">
        ${statusDisponiveis
          .map(
            (status) =>
              `<button type="button" class="chave" data-status="${status}" aria-pressed="false">${
                escapar(ROTULO_STATUS[status] ?? status)
              }</button>`
          )
          .join('')}
      </div>
    </form>`;
}

/** Liga os botoes de status da barra e devolve como ler o filtro atual. */
export function ligarBarraDeFiltro(raiz, aoMudar) {
  const form = raiz.querySelector('[data-filtro]');

  form.addEventListener('submit', (evento) => evento.preventDefault());
  form.addEventListener('input', () => aoMudar());
  form.querySelectorAll('[data-status]').forEach((botao) => {
    botao.addEventListener('click', () => {
      botao.setAttribute('aria-pressed', botao.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      aoMudar();
    });
  });

  return () => ({
    termo: form.elements.termo.value,
    status: [...form.querySelectorAll('[data-status][aria-pressed="true"]')].map((b) => b.dataset.status)
  });
}
