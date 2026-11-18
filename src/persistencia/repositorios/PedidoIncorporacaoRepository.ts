import {
  IPedidoIncorporacaoRepository,
  PedidoComProjeto
} from '../interfaces/IPedidoIncorporacaoRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';
import {
  PedidoIncorporacao,
  StatusPedidoIncorporacao
} from '../../dominio/entidades/PedidoIncorporacao';
import { Projeto, SituacaoProjeto } from '../../dominio/entidades/Projeto';

export class PedidoIncorporacaoRepository implements IPedidoIncorporacaoRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async inserir(pedido: PedidoIncorporacao, tx: Transacao): Promise<PedidoIncorporacao | null> {
    const resultado = await tx.query(
      `INSERT INTO pedido_incorporacao (projeto_id, coordenador_id, mensagem)
       VALUES ($1, $2, $3)
       ON CONFLICT (coordenador_id, projeto_id) WHERE status = 'PENDENTE' DO NOTHING
       RETURNING *`,
      [pedido.projetoId, pedido.coordenadorId, pedido.mensagem]
    );
    return resultado.rows.length ? montarPedido(resultado.rows[0]) : null;
  }

  async existePendente(
    coordenadorId: number,
    projetoId: number,
    tx?: Transacao
  ): Promise<boolean> {
    const resultado = await this.executor(tx).query(
      `SELECT 1 FROM pedido_incorporacao
        WHERE coordenador_id = $1 AND projeto_id = $2 AND status = 'PENDENTE'`,
      [coordenadorId, projetoId]
    );
    return resultado.rows.length > 0;
  }

  async buscarPorId(id: number, tx?: Transacao): Promise<PedidoIncorporacao | null> {
    const resultado = await this.executor(tx).query(
      `SELECT * FROM pedido_incorporacao WHERE id = $1`,
      [id]
    );
    return resultado.rows.length ? montarPedido(resultado.rows[0]) : null;
  }

  async buscarParaAtualizacao(id: number, tx: Transacao): Promise<PedidoIncorporacao | null> {
    const resultado = await tx.query(
      `SELECT * FROM pedido_incorporacao WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return resultado.rows.length ? montarPedido(resultado.rows[0]) : null;
  }

  async listarPendentes(): Promise<PedidoComProjeto[]> {
    return this.listarPorConsulta(
      `WHERE pi.status = 'PENDENTE'
        ORDER BY pi.solicitado_em, pi.id`,
      []
    );
  }

  async listarPendentesDoCoordenador(coordenadorId: number): Promise<PedidoComProjeto[]> {
    return this.listarPorConsulta(
      `WHERE pi.status = 'PENDENTE' AND pi.coordenador_id = $1
        ORDER BY pi.solicitado_em, pi.id`,
      [coordenadorId]
    );
  }

  private async listarPorConsulta(condicao: string, parametros: unknown[]): Promise<PedidoComProjeto[]> {
    const resultado = await this.executor().query(
      `SELECT pi.*,
              p.nome AS projeto_nome,
              p.descricao AS projeto_descricao,
              p.area AS projeto_area,
              p.icone AS projeto_icone,
              p.situacao AS projeto_situacao,
              p.coordenador_cadastrado AS projeto_coordenador_cadastrado,
              p.coordenador_id AS projeto_coordenador_id,
              u.nome AS coordenador_nome
         FROM pedido_incorporacao pi
         JOIN projeto p ON p.id = pi.projeto_id
         JOIN usuario u ON u.id = pi.coordenador_id
        ${condicao}`,
      parametros
    );
    return resultado.rows.map((linha) => ({
      pedido: montarPedido(linha),
      projeto: new Projeto(
        linha.projeto_id,
        linha.projeto_nome,
        linha.projeto_descricao,
        linha.projeto_area,
        linha.projeto_icone ?? null,
        linha.projeto_situacao as SituacaoProjeto,
        linha.projeto_coordenador_cadastrado,
        linha.projeto_coordenador_id ?? null
      ),
      coordenadorNome: linha.coordenador_nome
    }));
  }

  async atualizar(pedido: PedidoIncorporacao, tx: Transacao): Promise<void> {
    await tx.query(
      `UPDATE pedido_incorporacao
          SET status = $2, avaliado_em = $3
        WHERE id = $1`,
      [pedido.id, pedido.status, pedido.avaliadoEm]
    );
  }
}

function montarPedido(linha: any): PedidoIncorporacao {
  return new PedidoIncorporacao(
    linha.id,
    linha.projeto_id,
    linha.coordenador_id,
    linha.mensagem ?? null,
    linha.status as StatusPedidoIncorporacao,
    linha.solicitado_em,
    linha.avaliado_em ?? null
  );
}
