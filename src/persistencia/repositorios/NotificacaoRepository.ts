import {
  Notificacao,
  NovaNotificacao,
  TipoNotificacao
} from '../../dominio/entidades/Notificacao';
import { INotificacaoRepository } from '../interfaces/INotificacaoRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class NotificacaoRepository implements INotificacaoRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async inserir(nova: NovaNotificacao, tx?: Transacao): Promise<Notificacao> {
    const resultado = await this.executor(tx).query(
      `INSERT INTO notificacao (destinatario_id, tipo, texto, referencia_id)
            VALUES ($1, $2, $3, $4)
         RETURNING *`,
      [nova.destinatarioId, nova.tipo, nova.texto, nova.referenciaId]
    );
    return montarNotificacao(resultado.rows[0]);
  }

  async listarDoDestinatario(usuarioId: number, tipos: TipoNotificacao[]): Promise<Notificacao[]> {
    // Um parametro por tipo: funciona igual no `pg` e no PGlite, sem depender
    // de como cada driver converte arrays.
    const params: unknown[] = [usuarioId, ...tipos];
    const filtroDeTipo = tipos.length
      ? `AND tipo::text IN (${tipos.map((_, i) => `$${i + 2}`).join(', ')})`
      : '';

    const resultado = await this.executor().query(
      `SELECT * FROM notificacao
        WHERE destinatario_id = $1 ${filtroDeTipo}
        ORDER BY criada_em DESC, id DESC`,
      params
    );
    return resultado.rows.map(montarNotificacao);
  }

  async marcarTodasComoLidas(usuarioId: number): Promise<void> {
    await this.executor().query(
      `UPDATE notificacao SET lida = true WHERE destinatario_id = $1 AND NOT lida`,
      [usuarioId]
    );
  }
}

function montarNotificacao(linha: any): Notificacao {
  return new Notificacao(
    linha.id,
    linha.destinatario_id,
    linha.tipo as TipoNotificacao,
    linha.texto,
    linha.referencia_id ?? null,
    linha.lida,
    new Date(linha.criada_em)
  );
}
