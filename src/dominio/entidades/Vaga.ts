/**
 * Vaga de projeto de extensao: o recurso compartilhado do sistema.
 *
 * As regras sobre quando uma vaga esta disponivel moram AQUI, e nao espalhadas
 * em `if`s dentro dos servicos. Assim a regra existe uma vez so e nao corre o
 * risco de ser escrita de forma diferente em dois lugares.
 */
export class Vaga {
  constructor(
    public readonly id: number,
    public readonly projetoId: number,
    public readonly titulo: string,
    public readonly requisitos: string,
    public readonly cargaHoraria: number,
    public readonly turno: string,
    public readonly modalidade: string,
    public readonly semestreMinimo: number,
    public readonly vagasTotais: number,
    public readonly vagasRestantes: number,
    public readonly dataEncerramento: Date
  ) {}

  /** Ainda ha posicao livre nesta vaga. */
  temPosicaoDisponivel(): boolean {
    return this.vagasRestantes > 0;
  }

  /** O prazo de inscricao ainda nao passou (comparacao por dia, nao por hora). */
  prazoAberto(hoje: Date = new Date()): boolean {
    const inicioDeHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return this.dataEncerramento >= inicioDeHoje;
  }

  /** A vaga aceita candidaturas neste momento. */
  estaAberta(hoje: Date = new Date()): boolean {
    return this.temPosicaoDisponivel() && this.prazoAberto(hoje);
  }

  /** O estudante atende ao pre-requisito de semestre minimo. */
  aceitaSemestre(semestre: number): boolean {
    return semestre >= this.semestreMinimo;
  }
}
