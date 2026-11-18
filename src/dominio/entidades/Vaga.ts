import { hojeComoDia } from '../calendario';
import { combinaComLista } from '../busca';
import type { Usuario } from './Usuario';

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
  /** Texto livre que aparece em Detalhes da Vaga (C03). Pode ser vazio. */
  descricao: string;
  /** Vazia = o servico usa a area do projeto. */
  areasTematicas: string[];
  /** Vazia = aceita estudantes de todos os cursos. */
  cursosAceitos: string[];
  beneficio: string;
  /** null = participacao sem prazo definido. */
  duracaoEmMeses: number | null;
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
      dados.dataEncerramento,
      dados.descricao,
      dados.areasTematicas,
      dados.cursosAceitos,
      dados.beneficio,
      dados.duracaoEmMeses,
      // provisoria: a data que vale e a que o banco grava
      new Date()
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
    public readonly dataEncerramento: Date,
    public readonly descricao: string,
    public readonly areasTematicas: string[],
    public readonly cursosAceitos: string[],
    public readonly beneficio: string,
    public readonly duracaoEmMeses: number | null,
    public readonly publicadaEm: Date
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

  /**
   * O curso do estudante esta entre os aceitos. Lista vazia aceita todos.
   * A comparacao ignora maiusculas e acentos ("ciencia da computacao" vale).
   */
  aceitaCurso(curso: string | null): boolean {
    if (this.cursosAceitos.length === 0) return true;
    if (!curso) return false;
    return combinaComLista(curso, this.cursosAceitos);
  }

  /**
   * Por que este usuario NAO pode se candidatar agora, ou null se pode.
   *
   * E a regra unica de elegibilidade: o C04 usa para recusar a candidatura e
   * a tela Detalhes da Vaga (C03) usa para desabilitar o botao e mostrar o
   * motivo. As mensagens sao as mesmas que o C04 ja mostrava.
   *
   * Nao confere candidatura repetida, que depende do banco: isso e do servico.
   */
  motivoDeInelegibilidade(usuario: Usuario, agora: Date = new Date()): string | null {
    if (!usuario.ehEstudante()) {
      return 'Apenas estudantes podem se candidatar a vagas.';
    }
    if (!this.prazoAberto(agora)) {
      return 'O prazo de inscrição desta vaga já encerrou.';
    }
    // Pre-condicao do C04: dependencias de perfil preenchidas.
    if (!usuario.curso || usuario.semestre === null) {
      return 'Complete o seu perfil com o curso e o semestre para se candidatar.';
    }
    if (!this.aceitaCurso(usuario.curso)) {
      return `Esta vaga é só para ${listarEmPortugues(this.cursosAceitos)}. Seu curso é ${usuario.curso}.`;
    }
    if (!this.aceitaSemestre(usuario.semestreAtual())) {
      return (
        `Esta vaga exige estar no ${this.semestreMinimo}º semestre ou acima. ` +
        `Você está no ${usuario.semestreAtual()}º.`
      );
    }
    if (!this.temPosicaoDisponivel()) {
      return 'Esta vaga não tem mais posições disponíveis.';
    }
    return null;
  }
}

/** ["A", "B", "C"] vira "A, B e C". */
function listarEmPortugues(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}
