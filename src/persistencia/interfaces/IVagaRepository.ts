import { DadosNovaVaga, Vaga } from '../../dominio/entidades/Vaga';
import { Transacao } from './IUnidadeDeTrabalho';

/** Vaga acompanhada dos dados do projeto, para as telas de listagem. */
export interface VagaComProjeto {
  vaga: Vaga;
  projetoNome: string;
  projetoArea: string;
  coordenadorNome: string;
  /** Para o chip "Responsavel" do card levar ao perfil (C16). */
  coordenadorId: number;
}

export interface IVagaRepository {
  /**
   * Vagas abertas para a tela de busca (C01): prazo aberto E posicao livre.
   * E a mesma definicao que a contagem de vagas abertas do projeto usa.
   */
  listarAbertas(): Promise<VagaComProjeto[]>;

  /**
   * Todas as vagas de um projeto, abertas ou encerradas, para a Pagina do
   * Projeto (C02). As abertas vem primeiro; a tela usa `estaAberta()`.
   */
  listarDoProjeto(projetoId: number): Promise<VagaComProjeto[]>;

  buscarPorId(id: number, tx?: Transacao): Promise<Vaga | null>;

  /** Uma vaga com os dados do projeto, aberta ou encerrada (C03). */
  buscarComProjeto(id: number): Promise<VagaComProjeto | null>;

  /**
   * Busca a vaga TRAVANDO a linha no banco (SELECT ... FOR UPDATE).
   *
   * Qualquer outra transacao que peca a mesma vaga fica esperando aqui ate
   * esta terminar. E o que garante que a verificacao de posições disponíveis
   * e a reserva aconteçam sem que ninguem passe no meio.
   */
  buscarParaAtualizacao(id: number, tx: Transacao): Promise<Vaga | null>;

  /** Desconta uma posicao da vaga. So faz sentido dentro de uma transacao. */
  reservarUmaPosicao(id: number, tx: Transacao): Promise<void>;

  /**
   * Devolve uma posicao a vaga: candidatura recusada (C11), declinada (C07)
   * ou removida (C18). O banco recusa passar de `vagas_totais`.
   */
  liberarUmaPosicao(id: number, tx: Transacao): Promise<void>;

  /** Grava uma vaga nova com todas as posicoes livres (C06). */
  inserir(dados: DadosNovaVaga, tx: Transacao): Promise<Vaga>;
}
