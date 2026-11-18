import {
  Candidatura,
  StatusCandidatura,
} from '../../dominio/entidades/Candidatura';
import { HistoricoDeStatus } from '../../dominio/entidades/HistoricoDeStatus';
import { Usuario } from '../../dominio/entidades/Usuario';

import { Transacao } from './IUnidadeDeTrabalho';

/** Candidatura com o contexto da vaga, para o estudante acompanhar (C05). */
export interface CandidaturaComVaga {
  candidatura: Candidatura;
  vagaTitulo: string;
  projetoId: number;
  projetoNome: string;
  /** Vazio se o projeto ainda nao tem coordenador no sistema. */
  coordenadorNome: string;
}

/** Candidatura vista pelo coordenador do projeto (C15). */
export interface CandidaturaRecebida {
  candidatura: Candidatura;
  vagaTitulo: string;
  /** Nao esta no diagrama: o coordenador pode ter mais de um projeto, e a tela mostra qual. */
  projetoNome: string;
  estudante: Usuario;
}

/** Filtro das Candidaturas recebidas (C15). Campo vazio nao filtra. */
export interface FiltroDeCandidaturas {
  vagaId?: number | null;
  status?: StatusCandidatura[];
}

export interface ICandidaturaRepository {
  /** Ja existe candidatura deste estudante para esta vaga que nao foi removida (C18). */
  existeNaoRemovida(estudanteId: number, vagaId: number, tx?: Transacao): Promise<boolean>;

  /**
   * Grava a candidatura em EM_ANALISE e, na mesma transacao, a primeira linha
   * do historico: toda candidatura tem pelo menos uma (diagrama 1, `1..*`).
   */
  inserir(
    estudanteId: number,
    vagaId: number,
    mensagem: string | null,
    tx: Transacao
  ): Promise<Candidatura>;

  /**
   * Busca a candidatura TRAVANDO a linha (SELECT ... FOR UPDATE) ate o fim
   * da transacao: duas acoes sobre a mesma candidatura (aprovar e recusar ao
   * mesmo tempo, por exemplo) acontecem uma depois da outra.
   */
  buscarParaAtualizacao(id: number, tx: Transacao): Promise<Candidatura | null>;

  /** Grava o status e o motivo do declinio. */
  atualizar(candidatura: Candidatura, tx: Transacao): Promise<void>;

  /**
   * Acrescenta uma linha ao historico. `observacao` nao esta no diagrama:
   * leva o motivo do declinio (C07, 2.a) para a linha do tempo que a
   * coordenacao le.
   */
  registrarHistorico(
    candidaturaId: number,
    status: StatusCandidatura,
    agora: Date,
    tx: Transacao,
    observacao?: string | null
  ): Promise<void>;

  /** Linha do tempo, na ordem das transicoes (da primeira para a ultima). */
  listarHistorico(candidaturaId: number): Promise<HistoricoDeStatus[]>;

  /** Candidaturas do estudante, mais recentes primeiro. As removidas (C18) nao aparecem. */
  listarDoEstudante(estudanteId: number): Promise<CandidaturaComVaga[]>;

  /**
   * Uma candidatura do estudante, inclusive removida (e dele). `null` se nao
   * existir ou for de outro estudante. Nao esta no diagrama: e o par de
   * `buscarRecebida`, usado pelo detalhe do C05.
   */
  buscarDoEstudante(estudanteId: number, candidaturaId: number): Promise<CandidaturaComVaga | null>;

  /**
   * Candidaturas as vagas dos projetos que este usuario coordena, mais
   * recentes primeiro. As removidas (C18) nao aparecem.
   */
  listarDaCoordenacao(
    coordenadorId: number,
    filtro: FiltroDeCandidaturas
  ): Promise<CandidaturaRecebida[]>;

  /**
   * Uma candidatura a vaga de um projeto deste coordenador; `null` se nao for,
   * ou se o estudante a removeu (C18).
   */
  buscarRecebida(coordenadorId: number, candidaturaId: number): Promise<CandidaturaRecebida | null>;

  /** Candidaturas ainda em aberto do usuario: EM_ANALISE e ACEITA (usado pelo C14). */
  listarAtivasDoUsuario(usuarioId: number, tx: Transacao): Promise<Candidatura[]>;
}
