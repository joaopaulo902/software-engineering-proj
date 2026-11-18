import { PedidoIncorporacao } from '../../dominio/entidades/PedidoIncorporacao';
import { Projeto } from '../../dominio/entidades/Projeto';
import { Transacao } from './IUnidadeDeTrabalho';

export interface PedidoComProjeto {
  pedido: PedidoIncorporacao;
  projeto: Projeto;
  coordenadorNome: string;
}

export interface IPedidoIncorporacaoRepository {
  inserir(pedido: PedidoIncorporacao, tx: Transacao): Promise<PedidoIncorporacao | null>;
  existePendente(coordenadorId: number, projetoId: number, tx?: Transacao): Promise<boolean>;
  buscarPorId(id: number, tx?: Transacao): Promise<PedidoIncorporacao | null>;
  buscarParaAtualizacao(id: number, tx: Transacao): Promise<PedidoIncorporacao | null>;
  listarPendentes(): Promise<PedidoComProjeto[]>;
  listarPendentesDoCoordenador(coordenadorId: number): Promise<PedidoComProjeto[]>;
  atualizar(pedido: PedidoIncorporacao, tx: Transacao): Promise<void>;
}
