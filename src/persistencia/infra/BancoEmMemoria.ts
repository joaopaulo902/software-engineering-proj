import fs from 'fs';
import path from 'path';
import { IUnidadeDeTrabalho, Transacao } from '../interfaces/IUnidadeDeTrabalho';

/**
 * PostgreSQL em memoria, via PGlite (o proprio PostgreSQL compilado para WASM).
 *
 * Serve a dois propositos:
 *   1. rodar o sistema sem instalar nada, quando Docker ou PostgreSQL local
 *      nao estiverem disponiveis na maquina;
 *   2. verificar as regras de negocio automaticamente (ver `verificar.ts`).
 *
 * Note que NADA fora desta pasta muda. Os repositorios e os servicos nao
 * sabem qual das duas implementacoes esta rodando: eles enxergam apenas
 * `Transacao` e `IUnidadeDeTrabalho`. E para isso que servem as interfaces.
 */

type ConsultaPGlite = {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; affectedRows?: number }>;
};

class ExecutorPGlite implements Transacao {
  constructor(private readonly alvo: ConsultaPGlite) {}

  async query(sql: string, params?: unknown[]) {
    const resultado = await this.alvo.query(sql, params);
    const linhas = resultado.rows as any[];
    return { rows: linhas, rowCount: resultado.affectedRows ?? linhas.length };
  }
}

class UnidadeDeTrabalhoEmMemoria implements IUnidadeDeTrabalho {
  constructor(private readonly banco: any) {}

  async emTransacao<T>(trabalho: (tx: Transacao) => Promise<T>): Promise<T> {
    return this.banco.transaction(async (tx: ConsultaPGlite) =>
      trabalho(new ExecutorPGlite(tx))
    );
  }
}

export interface BancoEmMemoria {
  executor: Transacao;
  unidade: IUnidadeDeTrabalho;
  encerrar(): Promise<void>;
}

export async function criarBancoEmMemoria(pastaDb?: string): Promise<BancoEmMemoria> {
  const { PGlite } = await import('@electric-sql/pglite');
  const banco = new PGlite();

  const pasta = pastaDb ?? path.join(__dirname, '..', '..', '..', 'db');
  for (const arquivo of ['01-schema.sql', '02-seed.sql']) {
    await banco.exec(fs.readFileSync(path.join(pasta, arquivo), 'utf8'));
  }

  return {
    executor: new ExecutorPGlite(banco as unknown as ConsultaPGlite),
    unidade: new UnidadeDeTrabalhoEmMemoria(banco),
    encerrar: () => banco.close()
  };
}
