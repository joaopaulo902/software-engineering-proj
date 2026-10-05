import { Pool } from 'pg';
import { IUnidadeDeTrabalho, Transacao } from '../interfaces/IUnidadeDeTrabalho';

export const URL_PADRAO = 'postgres://extensao:extensao@localhost:5433/extensao';

export function criarPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? URL_PADRAO,
    max: 10
  });
}

/**
 * Implementacao da fachada de transacao sobre o driver `pg`.
 *
 * Esta e a UNICA classe do sistema que sabe o que sao BEGIN, COMMIT e
 * ROLLBACK. O servico de dominio so enxerga `emTransacao`.
 */
export class UnidadeDeTrabalho implements IUnidadeDeTrabalho {
  constructor(private readonly pool: Pool) {}

  async emTransacao<T>(trabalho: (tx: Transacao) => Promise<T>): Promise<T> {
    const conexao = await this.pool.connect();
    try {
      await conexao.query('BEGIN');
      const resultado = await trabalho(conexao as unknown as Transacao);
      await conexao.query('COMMIT');
      return resultado;
    } catch (erro) {
      await conexao.query('ROLLBACK');
      throw erro;
    } finally {
      // devolve a conexao ao pool mesmo se tudo falhar
      conexao.release();
    }
  }
}
