import { hojeComoDia } from '../calendario';

/** O que o coordenador informa ao publicar uma vaga (C06). */
export interface DadosNovaVaga {
  projetoId: number;
  titulo: string;
  requisitos: string;
  cargaHoraria: number;
  turno: string;
  modalidade: string;
  semestreMinimo: number;
  vagasTotais: number;
  /** Dia de calendario, na convencao de `calendario.ts`. */
  dataEncerramento: Date;
}

/**
 * Vaga de projeto de extensao: o recurso compartilhado do sistema.
 *
 * As regras sobre quando uma vaga esta disponivel moram AQUI, e nao espalhadas
 * em `if`s dentro dos servicos. Assim a regra existe uma vez so e nao corre o
 * risco de ser escrita de forma diferente em dois lugares.
 */
export class Vaga {
  /**
   * A vaga que o coordenador esta publicando, antes de existir no banco.
   * Nasce com todas as posicoes livres, porque ninguem se candidatou ainda.
   */
  static nova(dados: DadosNovaVaga): Vaga {
    return new Vaga(
      0,
      dados.projetoId,
      dados.titulo,
      dados.requisitos,
      dados.cargaHoraria,
      dados.turno,
      dados.modalidade,
      dados.semestreMinimo,
      dados.vagasTotais,
      dados.vagasTotais,
      dados.dataEncerramento
    );
  }

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

  /**
   * O prazo de inscricao ainda nao passou. A comparacao e por dia de
   * calendario: uma vaga que encerra hoje aceita candidaturas o dia inteiro.
   */
  prazoAberto(agora: Date = new Date()): boolean {
    return this.dataEncerramento >= hojeComoDia(agora);
  }

  /** A vaga aceita candidaturas neste momento. */
  estaAberta(agora: Date = new Date()): boolean {
    return this.temPosicaoDisponivel() && this.prazoAberto(agora);
  }

  /** O estudante atende ao pre-requisito de semestre minimo. */
  aceitaSemestre(semestre: number): boolean {
    return semestre >= this.semestreMinimo;
  }
}
