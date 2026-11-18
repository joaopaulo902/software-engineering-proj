import {
  EstadoBase,
  EstadoCandidatura,
} from './EstadoCandidatura';
import { HistoricoDeStatus } from './HistoricoDeStatus';

export type StatusCandidatura =
  | 'EM_ANALISE'
  | 'ACEITA'
  | 'RECUSADA'
  | 'CONFIRMADA'
  | 'DECLINADA'
  | 'REMOVIDA';

/** Os seis status, na ordem do processo. Usado para validar filtros. */
export const STATUS_DE_CANDIDATURA: readonly StatusCandidatura[] = [
  'EM_ANALISE',
  'ACEITA',
  'RECUSADA',
  'CONFIRMADA',
  'DECLINADA',
  'REMOVIDA'
];

/**
 * Candidatura: a transacao do negocio.
 *
 * Nao e uma coisa que existe sozinha, e sim o vinculo entre um Estudante e uma
 * Vaga, com um estado que evolui no tempo. Quem decide que transicoes valem e
 * o estado atual (padrao State, ver `EstadoCandidatura.ts`); o `status` e
 * derivado dele.
 *
 * Cada transicao anota uma linha de historico ainda nao gravada. O servico,
 * dentro da mesma transacao de banco, grava o status novo e essas linhas.
 */
export class Candidatura {

  private estado: EstadoCandidatura;
  private motivo: string | null;
  private readonly historicoNovo: HistoricoDeStatus[] = [];

  constructor(
    public readonly id: number,
    public readonly vagaId: number,
    public readonly estudanteId: number,
    status: StatusCandidatura,
    public readonly mensagem: string | null,
    public readonly criadaEm: Date,
    motivoDeclinio: string | null = null
  ) {

    this.estado = EstadoBase.para(status);
    this.motivo = motivoDeclinio;

  }

  /** Derivado do estado atual. */
  get status(): StatusCandidatura {
    return this.estado.status();
  }

  /** Preenchido quando o estudante declina o ingresso (C07, fluxo 2.a). */
  get motivoDeclinio(): string | null {
    return this.motivo;
  }

  /** C11: o coordenador aprova. */
  aceitar(agora: Date = new Date()): void {
    this.estado.aceitar(this, agora);
  }

  /** C11: o coordenador recusa. */
  recusar(agora: Date = new Date()): void {
    this.estado.recusar(this, agora);
  }

  /** C07: o estudante confirma o ingresso. */
  confirmar(agora: Date = new Date()): void {
    this.estado.confirmar(this, agora);
  }

  /** C07, fluxo 2.a: o estudante declina o ingresso, com um motivo opcional. */
  declinar(motivo: string | null, agora: Date = new Date()): void {
    this.estado.declinar(this, motivo, agora);
  }

  /** C18: o estudante remove a candidatura. */
  remover(agora: Date = new Date()): void {
    this.estado.remover(this, agora);
  }

  /** Segura uma posicao da vaga: EM_ANALISE, ACEITA e CONFIRMADA. */
  ocupaPosicao(): boolean {
    return this.estado.ocupaPosicao();
  }

  estaEmAnalise(): boolean {
    return this.status === 'EM_ANALISE';
  }

  /** Linhas de historico geradas pelas transicoes e ainda nao gravadas. */
  historicoNaoGravado(): readonly HistoricoDeStatus[] {
    return this.historicoNovo;
  }

  // Usados apenas pelas classes de estado (padrao State).

  /** Troca o estado e anota a linha de historico da transicao. */
  transicionarPara(novo: EstadoCandidatura, agora: Date, observacao: string | null = null): void {

    this.estado = novo;
    this.historicoNovo.push(new HistoricoDeStatus(0, this.id, novo.status(), agora, observacao));

  }

  registrarMotivoDeclinio(motivo: string | null): void {
    this.motivo = motivo;
  }

}
