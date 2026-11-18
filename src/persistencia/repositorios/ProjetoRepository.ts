import { Projeto, SituacaoProjeto } from '../../dominio/entidades/Projeto';
import { StatusCandidatura } from '../../dominio/entidades/Candidatura';
import { formatarDia, hojeComoDia } from '../../dominio/calendario';
import {
  ContextoDaCandidatura,
  IProjetoRepository,
  ResumoDeProjeto
} from '../interfaces/IProjetoRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

/**
 * Projeto com o nome do coordenador e as vagas abertas. $1 e "hoje".
 *
 * "Hoje" vai como parametro, pelo mesmo motivo do VagaRepository: o
 * CURRENT_DATE segue o fuso do banco, nao o do servidor da aplicacao.
 */
const SELECT_RESUMO = `
  SELECT p.*,
         u.nome AS coordenador_nome,
         (SELECT count(*)
            FROM vaga v
           WHERE v.projeto_id = p.id
             AND v.vagas_restantes > 0
             AND v.data_encerramento >= $1::date)::int AS vagas_abertas
    FROM projeto p
    LEFT JOIN usuario u ON u.id = p.coordenador_id`;

export class ProjetoRepository implements IProjetoRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async buscarPorId(id: number, tx?: Transacao): Promise<Projeto | null> {
    const resultado = await this.executor(tx).query(`SELECT * FROM projeto WHERE id = $1`, [id]);
    return resultado.rows.length ? montarProjeto(resultado.rows[0]) : null;
  }

  async listarComCoordenador(): Promise<ResumoDeProjeto[]> {
    const hoje = formatarDia(hojeComoDia());
    const resultado = await this.executor().query(
      `${SELECT_RESUMO}
        ORDER BY p.nome`,
      [hoje]
    );
    return resultado.rows.map(montarResumo);
  }

  async buscarResumo(id: number): Promise<ResumoDeProjeto | null> {
    const hoje = formatarDia(hojeComoDia());
    const resultado = await this.executor().query(
      `${SELECT_RESUMO}
        WHERE p.id = $2`,
      [hoje, id]
    );
    return resultado.rows.length ? montarResumo(resultado.rows[0]) : null;
  }

  async listarDoCoordenador(coordenadorId: number): Promise<Projeto[]> {
    const resultado = await this.executor().query(
      `SELECT * FROM projeto WHERE coordenador_id = $1 ORDER BY nome`,
      [coordenadorId]
    );
    return resultado.rows.map(montarProjeto);
  }

  async listarNaoIncorporados(termo?: string): Promise<Projeto[]> {
    const consulta = termo?.trim();
    const resultado = await this.executor().query(
      `SELECT * FROM projeto
        WHERE coordenador_id IS NULL
          AND situacao = 'ATIVO'
          AND ($1::text IS NULL OR nome ILIKE $2 OR descricao ILIKE $2 OR area ILIKE $2)
        ORDER BY nome`,
      [consulta || null, consulta ? `%${consulta}%` : null]
    );
    return resultado.rows.map(montarProjeto);
  }

  async definirCoordenador(
    projetoId: number,
    coordenadorId: number,
    tx: Transacao
  ): Promise<boolean> {
    const resultado = await tx.query(
      `UPDATE projeto SET coordenador_id = $2
        WHERE id = $1 AND coordenador_id IS NULL AND situacao = 'ATIVO'`,
      [projetoId, coordenadorId]
    );
    return resultado.rowCount === 1;
  }

  async buscarContextoDaCandidatura(candidaturaId: number): Promise<ContextoDaCandidatura | null> {
    const resultado = await this.executor().query(
      `SELECT p.*,
              c.id           AS candidatura_id,
              c.status       AS candidatura_status,
              c.estudante_id AS estudante_id,
              e.nome         AS estudante_nome,
              v.titulo       AS vaga_titulo
         FROM candidatura c
         JOIN usuario e ON e.id = c.estudante_id
         JOIN vaga v    ON v.id = c.vaga_id
         JOIN projeto p ON p.id = v.projeto_id
        WHERE c.id = $1`,
      [candidaturaId]
    );
    if (!resultado.rows.length) return null;
    const linha = resultado.rows[0];
    return {
      candidaturaId: linha.candidatura_id,
      status: linha.candidatura_status as StatusCandidatura,
      estudanteId: linha.estudante_id,
      estudanteNome: linha.estudante_nome,
      vagaTitulo: linha.vaga_titulo,
      projeto: montarProjeto(linha)
    };
  }
}

function montarResumo(linha: any): ResumoDeProjeto {
  return {
    projeto: montarProjeto(linha),
    coordenadorNome: linha.coordenador_nome ?? null,
    vagasAbertas: Number(linha.vagas_abertas)
  };
}

function montarProjeto(linha: any): Projeto {
  return new Projeto(
    linha.id,
    linha.nome,
    linha.descricao,
    linha.area,
    linha.icone ?? null,
    linha.situacao as SituacaoProjeto,
    linha.coordenador_cadastrado,
    linha.coordenador_id ?? null
  );
}
