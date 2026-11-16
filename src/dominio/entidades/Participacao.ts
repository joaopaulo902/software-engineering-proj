import { hojeComoDia } from '../calendario';

/**
 * Vinculo de um usuario com a equipe de um projeto.
 *
 * Nasce quando o estudante confirma o ingresso (C07, dupla A) e termina
 * quando ele sai, e removido pelo coordenador ou o prazo da vaga acaba.
 * Enquanto ativa, da direito a postar atividades no projeto (C10).
 */
export class Participacao {
  constructor(
    public readonly id: number,
    public readonly projetoId: number,
    public readonly usuarioId: number,
    public readonly candidaturaId: number | null,
    public cargo: string,
    public readonly inicio: Date,
    public fim: Date | null,
    /** Dia de calendario: inicio + duracaoEmMeses da vaga, quando houver. */
    public readonly previstoAte: Date | null,
    public mensagemDeSaida: string | null
  ) {}

  estaAtiva(): boolean {
    return this.fim === null;
  }

  /** O prazo previsto ja passou (o ultimo dia ainda conta como dentro do prazo). */
  venceu(agora: Date = new Date()): boolean {
    return this.previstoAte !== null && this.previstoAte < hojeComoDia(agora);
  }

  encerrar(mensagem: string | null, agora: Date = new Date()): void {
    if (!this.estaAtiva()) {
      throw new Error('Participação já encerrada.');
    }
    this.fim = agora;
    this.mensagemDeSaida = mensagem;
  }
}
