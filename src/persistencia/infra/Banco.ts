import { Pool, types } from 'pg';
import { IUnidadeDeTrabalho, Transacao } from '../interfaces/IUnidadeDeTrabalho';

export const URL_PADRAO = 'postgres://extensao:extensao@localhost:5433/extensao';

// O `pg` devolve colunas DATE como meia-noite LOCAL; o PGlite, como meia-noite
// UTC. Pedimos o texto cru ("AAAA-MM-DD") e os repositorios convertem, para os
// dois bancos seguirem a mesma convencao (ver dominio/calendario.ts).
// 1082 e o codigo interno do tipo DATE no PostgreSQL.
types.setTypeParser(1082, (texto: string) => texto);

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
