import { Vaga } from '../../dominio/entidades/Vaga';
import { Transacao } from './IUnidadeDeTrabalho';

/** Vaga acompanhada dos dados do projeto, para as telas de listagem. */
export interface VagaComProjeto {
  vaga: Vaga;
  projetoNome: string;
  projetoArea: string;
  coordenadorNome: string;
}

export interface IVagaRepository {
  /** Vagas com prazo aberto, para a tela de busca (C01). */
  listarAbertas(): Promise<VagaComProjeto[]>;

  buscarPorId(id: number, tx?: Transacao): Promise<Vaga | null>;

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
}
