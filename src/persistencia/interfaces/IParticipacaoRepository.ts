import { Participacao } from '../../dominio/entidades/Participacao';
import { Transacao } from './IUnidadeDeTrabalho';

/** Projeto do usuario, para Meus Projetos. */
export interface ParticipacaoComProjeto {
  /** Vazio quando o usuario e o coordenador do projeto, e nao membro da equipe. */
  participacao: Participacao | null;
  projetoId: number;
  projetoNome: string;
  projetoArea: string;
  projetoIcone: string | null;
  cargo: string;
}

/** Membro da equipe, para a tela Participantes. */
export interface Participante {
  participacao: Participacao;
  nome: string;
}

export interface IParticipacaoRepository {
  /**
   * Grava a participacao nova (C07, dupla A) e a devolve com o id. O banco
   * recusa uma segunda participacao ATIVA da mesma pessoa no mesmo projeto
   * e uma segunda participacao vinda da mesma candidatura.
   */
  inserir(participacao: Participacao, tx: Transacao): Promise<Participacao>;

  buscarPorId(id: number, tx?: Transacao): Promise<Participacao | null>;

  /** Participacoes do usuario, as ativas primeiro. */
  listarDoUsuario(usuarioId: number): Promise<ParticipacaoComProjeto[]>;

  /** Equipe atual do projeto (so participacoes ativas). */
  listarDoProjeto(projetoId: number): Promise<Participante[]>;

  /** O usuario tem participacao ATIVA no projeto. */
  estaVinculado(usuarioId: number, projetoId: number, tx?: Transacao): Promise<boolean>;

  /** Grava cargo, fim e mensagem de saida. */
  atualizar(participacao: Participacao, tx: Transacao): Promise<void>;
}
