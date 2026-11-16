import { Projeto } from '../../dominio/entidades/Projeto';
import { StatusCandidatura } from '../../dominio/entidades/Candidatura';
import { Transacao } from './IUnidadeDeTrabalho';

/** Projeto com o que a listagem mostra no card (C01, C02). */
export interface ResumoDeProjeto {
  projeto: Projeto;
  /** Nome do coordenador no sistema; vazio se o projeto nao foi incorporado. */
  coordenadorNome: string | null;
  /** Vagas com prazo aberto e posicao livre. */
  vagasAbertas: number;
}

/**
 * O projeto ao qual uma candidatura pertence, com o que os avisos precisam
 * dizer sobre ela. Usado pelo NotificadorInApp nos eventos de candidatura.
 */
export interface ContextoDaCandidatura {
  candidaturaId: number;
  status: StatusCandidatura;
  estudanteId: number;
  estudanteNome: string;
  vagaTitulo: string;
  projeto: Projeto;
}

export interface IProjetoRepository {
  buscarPorId(id: number, tx?: Transacao): Promise<Projeto | null>;

  /** Todos os projetos, com o nome do coordenador e as vagas abertas. */
  listarComCoordenador(): Promise<ResumoDeProjeto[]>;

  /** Projetos que este usuario coordena, para o formulario do C06 e Meus Projetos. */
  listarDoCoordenador(coordenadorId: number): Promise<Projeto[]>;

  buscarContextoDaCandidatura(candidaturaId: number): Promise<ContextoDaCandidatura | null>;
}
