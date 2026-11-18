// Componentes das telas de candidatura (C05, C07, C11, C15 e C18).

import { diaBr, dataHoraBr, iniciais } from '../formatos';

/**
 * Nomes dos status na interface. As chaves sao as do enum StatusCandidatura
 * do diagrama de classes (pagina 1).
 *
 * CANCELADA e o nome que o banco da Etapa 2 usava; continua aqui para uma
 * candidatura antiga ainda aparecer com nome legivel.
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

export function EtiquetaStatus({ status }) {
  return (
    <span className={`etiqueta etiqueta--${String(status).toLowerCase()}`}>
      {ROTULO_STATUS[status] ?? status}
    </span>
  );
}

/** Card de "Minhas candidaturas" (C05). O card inteiro leva a Minha Candidatura. */
export function CardDeCandidatura({ item }) {
  return (
    <a className="card card--compacto card--link" href={`#/candidaturas/${item.id}`}>
      <header className="card__topo">
        <div>
          <h3>{item.vagaTitulo}</h3>
          <p className="card__projeto">{item.projetoNome}</p>
        </div>
        <EtiquetaStatus status={item.status} />
      </header>
      <p className="card__coordenador">
        {item.coordenadorNome ? <>Coordenação: {item.coordenadorNome} &middot; </> : null}
        Enviada em {diaBr(item.criadaEm)}
      </p>
    </a>
  );
}

/** Card de "Candidaturas recebidas" (C15). Leva a Candidatura do coordenador. */
export function CardDeCandidaturaRecebida({ item }) {
  const estudante = item.estudante ?? {};
  return (
    <a className="card card--compacto card--link" href={`#/candidaturas/recebidas/${item.id}`}>
      <header className="card__topo">
        <div className="pessoa">
          <span className="avatar" aria-hidden="true">{iniciais(estudante.nome)}</span>
          <div>
            <h3>{estudante.nome}</h3>
            <p className="card__projeto">{descricaoDoEstudante(estudante)}</p>
          </div>
        </div>
        <EtiquetaStatus status={item.status} />
      </header>
      <p className="card__coordenador">
        {item.vagaTitulo}
        {item.projetoNome ? <> &middot; {item.projetoNome}</> : null}
        {' '}&middot; Recebida em {diaBr(item.criadaEm)}
      </p>
    </a>
  );
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
export function LinhaDoTempo({ historico }) {
  if (!historico || historico.length === 0) return null;

  const ordenado = [...historico].sort(
    (a, b) => new Date(a.ocorridoEm).getTime() - new Date(b.ocorridoEm).getTime()
  );

  return (
    <ol className="historico">
      {ordenado.map((passo, indice) => {
        const atual = indice === ordenado.length - 1;
        const classes = ['historico__passo'];
        if (atual) {
          classes.push('historico__passo--atual', `historico__passo--${String(passo.status).toLowerCase()}`);
        }
        return (
          <li className={classes.join(' ')} key={`${passo.status}-${passo.ocorridoEm}-${indice}`}>
            <span className="historico__titulo">{ROTULO_NO_HISTORICO[passo.status] ?? passo.status}</span>
            <time className="historico__quando" dateTime={new Date(passo.ocorridoEm).toISOString()}>
              {dataHoraBr(passo.ocorridoEm)}
            </time>
            {passo.observacao && <p className="historico__nota">“{passo.observacao}”</p>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Barra de busca das listas de candidatura: campo de texto e os status como
 * botoes de liga/desliga (o filtro aceita varios status, como o
 * FiltroDeCandidaturas do diagrama). `extra` entra entre os dois.
 */
export function BarraDeFiltro({ dica, statusDisponiveis, termo, aoMudarTermo, status, aoMudarStatus, extra = null }) {
  function alternar(valor) {
    aoMudarStatus(status.includes(valor) ? status.filter((s) => s !== valor) : [...status, valor]);
  }

  return (
    <form className="filtro" role="search" onSubmit={(evento) => evento.preventDefault()}>
      <div className="filtro__linha">
        <input
          type="search"
          name="termo"
          placeholder={dica}
          aria-label={dica}
          value={termo}
          onChange={(evento) => aoMudarTermo(evento.target.value)}
        />
        {extra}
      </div>
      <div className="filtro__status" role="group" aria-label="Filtrar por status">
        {statusDisponiveis.map((valor) => (
          <button
            type="button"
            className="chave"
            key={valor}
            aria-pressed={status.includes(valor)}
            onClick={() => alternar(valor)}
          >
            {ROTULO_STATUS[valor] ?? valor}
          </button>
        ))}
      </div>
    </form>
  );
}
