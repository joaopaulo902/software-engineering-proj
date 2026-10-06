import { DadosNovaVaga, Vaga } from '../../dominio/entidades/Vaga';
import { formatarDia, hojeComoDia } from '../../dominio/calendario';
import { IVagaRepository, VagaComProjeto } from '../interfaces/IVagaRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class VagaRepository implements IVagaRepository {
  /** Recebe o executor de SQL pela interface, nao a classe Pool do driver. */
  constructor(private readonly db: Transacao) {}

  /** Usa a transacao quando ha uma; fora dela, o executor padrao. */
  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  /**
   * "Hoje" vai como parametro, calculado pelo servidor da aplicacao, em vez
   * de CURRENT_DATE. O CURRENT_DATE segue o fuso do BANCO: o PGlite roda em
   * GMT e, a partir das 21h de Brasilia, ja acha que e amanha. Uma vaga que
   * encerra hoje sumiria do feed antes da hora.
   */
  async listarAbertas(): Promise<VagaComProjeto[]> {
    const hoje = formatarDia(hojeComoDia());
    const resultado = await this.executor().query(
      `SELECT v.*,
              p.nome AS projeto_nome,
              p.area AS projeto_area,
              u.nome AS coordenador_nome
         FROM vaga v
         JOIN projeto p ON p.id = v.projeto_id
         JOIN usuario u ON u.id = p.coordenador_id
        WHERE v.data_encerramento >= $1::date
        ORDER BY v.data_encerramento, v.titulo`,
      [hoje]
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

  /**
   * A data vai como texto "AAAA-MM-DD". Mandar o objeto Date deixaria cada
   * driver converter do seu jeito, e o `pg` usa o fuso local: o dia 30 viraria
   * 29 as 21h, e o banco gravaria o dia errado.
   */
  async inserir(dados: DadosNovaVaga, tx: Transacao): Promise<Vaga> {
    const resultado = await tx.query(
      `INSERT INTO vaga
         (projeto_id, titulo, requisitos, carga_horaria, turno, modalidade,
          semestre_minimo, vagas_totais, vagas_restantes, data_encerramento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9::date)
       RETURNING *`,
      [
        dados.projetoId,
        dados.titulo,
        dados.requisitos,
        dados.cargaHoraria,
        dados.turno,
        dados.modalidade,
        dados.semestreMinimo,
        dados.vagasTotais,
        formatarDia(dados.dataEncerramento)
      ]
    );
    return montarVaga(resultado.rows[0]);
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
    // Chega como "AAAA-MM-DD" (pg) ou como meia-noite UTC (PGlite); nos dois
    // casos `new Date` produz a meia-noite UTC do dia, a convencao do dominio.
    new Date(linha.data_encerramento)
  );
}
