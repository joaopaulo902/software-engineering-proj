import { Candidatura } from '../../dominio/entidades/Candidatura';
import { Transacao } from './IUnidadeDeTrabalho';

/** Candidatura com o contexto da vaga, para a tela de acompanhamento (C05). */
export interface CandidaturaComVaga {
  candidatura: Candidatura;
  vagaTitulo: string;
  projetoNome: string;
}

export interface ICandidaturaRepository {
  /** Ja existe candidatura deste estudante para esta vaga. */
  existe(estudanteId: number, vagaId: number, tx?: Transacao): Promise<boolean>;

  inserir(
    estudanteId: number,
    vagaId: number,
    mensagem: string | null,
    tx: Transacao
  ): Promise<Candidatura>;

  listarDoEstudante(estudanteId: number): Promise<CandidaturaComVaga[]>;
}
