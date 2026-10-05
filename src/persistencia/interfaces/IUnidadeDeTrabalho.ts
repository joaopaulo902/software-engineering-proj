/**
 * Fachada da camada de Persistencia (passo 6 do roteiro de camadas).
 *
 * O Dominio nao conhece `pg`, nem `Pool`, nem `PoolClient`. Ele conhece
 * apenas estes dois tipos. Trocar o PostgreSQL por outro banco mudaria as
 * implementacoes, nunca estas assinaturas.
 */

/** Algo capaz de executar SQL: o pool, ou uma conexao dentro de uma transacao. */
export interface Transacao {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface IUnidadeDeTrabalho {
  /**
   * Executa `trabalho` dentro de UMA transacao de banco.
   *
   * Confirma (COMMIT) se o trabalho terminar sem erro; desfaz tudo (ROLLBACK)
   * se qualquer passo falhar. E esta garantia que impede duas candidaturas
   * simultaneas de ocuparem a mesma ultima posicao de uma vaga.
   */
  emTransacao<T>(trabalho: (tx: Transacao) => Promise<T>): Promise<T>;
}
