import { Candidatura, StatusCandidatura } from '../../dominio/entidades/Candidatura';
import {
  ICandidaturaRepository,
  CandidaturaComVaga
} from '../interfaces/ICandidaturaRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class CandidaturaRepository implements ICandidaturaRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async existe(estudanteId: number, vagaId: number, tx?: Transacao): Promise<boolean> {
    const resultado = await this.executor(tx).query(
      `SELECT 1 FROM candidatura WHERE estudante_id = $1 AND vaga_id = $2`,
      [estudanteId, vagaId]
    );
    return resultado.rows.length > 0;
  }

  async inserir(
    estudanteId: number,
    vagaId: number,
    mensagem: string | null,
    tx: Transacao
  ): Promise<Candidatura> {
    const resultado = await tx.query(
      `INSERT INTO candidatura (estudante_id, vaga_id, mensagem, status)
            VALUES ($1, $2, $3, 'EM_ANALISE')
         RETURNING *`,
      [estudanteId, vagaId, mensagem]
    );
    return montarCandidatura(resultado.rows[0]);
  }

  async listarDoEstudante(estudanteId: number): Promise<CandidaturaComVaga[]> {
    const resultado = await this.executor().query(
      `SELECT c.*,
              v.titulo AS vaga_titulo,
              p.nome   AS projeto_nome
         FROM candidatura c
         JOIN vaga v    ON v.id = c.vaga_id
         JOIN projeto p ON p.id = v.projeto_id
        WHERE c.estudante_id = $1
        ORDER BY c.criada_em DESC`,
      [estudanteId]
    );

    return resultado.rows.map((linha) => ({
      candidatura: montarCandidatura(linha),
      vagaTitulo: linha.vaga_titulo,
      projetoNome: linha.projeto_nome
    }));
  }
}

function montarCandidatura(linha: any): Candidatura {
  return new Candidatura(
    linha.id,
    linha.vaga_id,
    linha.estudante_id,
    linha.status as StatusCandidatura,
    linha.mensagem,
    new Date(linha.criada_em)
  );
}
