import { Vaga } from '../../dominio/entidades/Vaga';
import { IVagaRepository, VagaComProjeto } from '../interfaces/IVagaRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class VagaRepository implements IVagaRepository {
  /** Recebe o executor de SQL pela interface, nao a classe Pool do driver. */
  constructor(private readonly db: Transacao) {}

  /** Usa a transacao quando ha uma; fora dela, o executor padrao. */
  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async listarAbertas(): Promise<VagaComProjeto[]> {
    const resultado = await this.executor().query(
      `SELECT v.*,
              p.nome AS projeto_nome,
              p.area AS projeto_area,
              u.nome AS coordenador_nome
         FROM vaga v
         JOIN projeto p ON p.id = v.projeto_id
         JOIN usuario u ON u.id = p.coordenador_id
        WHERE v.data_encerramento >= CURRENT_DATE
        ORDER BY v.data_encerramento, v.titulo`
    );

    return resultado.rows.map((linha) => ({
      vaga: montarVaga(linha),
      projetoNome: linha.projeto_nome,
      projetoArea: linha.projeto_area,
      coordenadorNome: linha.coordenador_nome
    }));
  }

  async buscarPorId(id: number, tx?: Transacao): Promise<Vaga | null> {
    const resultado = await this.executor(tx).query(`SELECT * FROM vaga WHERE id = $1`, [id]);
    return resultado.rows.length ? montarVaga(resultado.rows[0]) : null;
  }

  /**
   * FOR UPDATE trava a linha ate o fim da transacao.
   *
   * Este `FOR UPDATE` e a linha mais importante do caso de uso: e ele que
   * serializa duas candidaturas simultaneas para a mesma vaga.
   */
  async buscarParaAtualizacao(id: number, tx: Transacao): Promise<Vaga | null> {
    const resultado = await tx.query(`SELECT * FROM vaga WHERE id = $1 FOR UPDATE`, [id]);
    return resultado.rows.length ? montarVaga(resultado.rows[0]) : null;
  }

  async reservarUmaPosicao(id: number, tx: Transacao): Promise<void> {
    await tx.query(
      `UPDATE vaga SET vagas_restantes = vagas_restantes - 1 WHERE id = $1`,
      [id]
    );
  }
}

/** Traduz uma linha do banco para a entidade de dominio. */
function montarVaga(linha: any): Vaga {
  return new Vaga(
    linha.id,
    linha.projeto_id,
    linha.titulo,
    linha.requisitos,
    linha.carga_horaria,
    linha.turno,
    linha.modalidade,
    linha.semestre_minimo,
    linha.vagas_totais,
    linha.vagas_restantes,
    new Date(linha.data_encerramento)
  );
}
