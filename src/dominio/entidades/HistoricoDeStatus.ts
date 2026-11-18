import type { StatusCandidatura } from './Candidatura';

/**
 * Uma linha da linha do tempo de uma candidatura (C05): em que status ela
 * entrou e quando.
 *
 * Toda candidatura tem pelo menos uma (EM_ANALISE, gravada junto com ela no
 * C04); cada transicao do padrao State acrescenta outra. A observacao guarda
 * o motivo do declinio (C07, fluxo 2.a), para a coordenacao ler.
 */
export class HistoricoDeStatus {

  constructor(
    /** 0 enquanto a linha ainda nao foi gravada. */
    public readonly id: number,
    public readonly candidaturaId: number,
    public readonly status: StatusCandidatura,
    public readonly ocorridoEm: Date,
    public readonly observacao: string | null
  ) {}

}
