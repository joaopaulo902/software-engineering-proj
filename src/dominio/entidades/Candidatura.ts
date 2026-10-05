export type StatusCandidatura =
  | 'EM_ANALISE'
  | 'ACEITA'
  | 'RECUSADA'
  | 'CONFIRMADA'
  | 'CANCELADA';

/**
 * Candidatura: a transacao do negocio.
 *
 * Nao e uma coisa que existe sozinha, e sim o vinculo entre um Estudante e uma
 * Vaga, com um estado que evolui no tempo:
 *
 *   EM_ANALISE --(C11 coordenador aprova)--> ACEITA --(C07 estudante confirma)--> CONFIRMADA
 *              \-(C11 coordenador recusa)--> RECUSADA
 */
export class Candidatura {
  constructor(
    public readonly id: number,
    public readonly vagaId: number,
    public readonly estudanteId: number,
    public readonly status: StatusCandidatura,
    public readonly mensagem: string | null,
    public readonly criadaEm: Date
  ) {}

  estaEmAnalise(): boolean {
    return this.status === 'EM_ANALISE';
  }

  /** So uma candidatura aceita pelo coordenador pode ser confirmada (C07). */
  podeSerConfirmada(): boolean {
    return this.status === 'ACEITA';
  }

  /** Candidaturas encerradas nao ocupam mais posicao na vaga. */
  estaEncerrada(): boolean {
    return this.status === 'RECUSADA' || this.status === 'CANCELADA';
  }
}
