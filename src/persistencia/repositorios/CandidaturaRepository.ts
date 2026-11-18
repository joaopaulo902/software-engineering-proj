import {
  Candidatura,
  StatusCandidatura,
} from '../../dominio/entidades/Candidatura';
import { HistoricoDeStatus } from '../../dominio/entidades/HistoricoDeStatus';
import {
  Papel,
  Usuario,
} from '../../dominio/entidades/Usuario';

import {
  CandidaturaComVaga,
  CandidaturaRecebida,
  FiltroDeCandidaturas,
  ICandidaturaRepository,
} from '../interfaces/ICandidaturaRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

/** Candidatura com a vaga, o projeto e o coordenador: o que o estudante ve (C05). */
const SELECT_COM_VAGA = `
  SELECT c.*,
         v.titulo AS vaga_titulo,
         p.id     AS projeto_id,
         p.nome   AS projeto_nome,
         u.nome   AS coordenador_nome
    FROM candidatura c
    JOIN vaga v         ON v.id = c.vaga_id
    JOIN projeto p      ON p.id = v.projeto_id
    LEFT JOIN usuario u ON u.id = p.coordenador_id`;

/**
 * Candidatura com a vaga, o projeto e o estudante: o que o coordenador ve
 * (C15). $1 e o coordenador. As colunas do estudante levam o prefixo
 * `aluno_` para nao colidir com as da candidatura.
 *
 * A removida (C18) nunca aparece para o coordenador, nem na lista nem pelo
 * id: o estudante a retirou ("a coordenacao nao ve mais esta candidatura").
 */
const SELECT_RECEBIDA = `
  SELECT c.*,
         v.titulo   AS vaga_titulo,
         p.nome     AS projeto_nome,
         e.id       AS aluno_id,
         e.nome     AS aluno_nome,
         e.email    AS aluno_email,
         e.papel    AS aluno_papel,
         e.curso    AS aluno_curso,
         e.semestre AS aluno_semestre
    FROM candidatura c
    JOIN vaga v    ON v.id = c.vaga_id
    JOIN projeto p ON p.id = v.projeto_id
    JOIN usuario e ON e.id = c.estudante_id
   WHERE p.coordenador_id = $1
     AND c.status <> 'REMOVIDA'`;

export class CandidaturaRepository implements ICandidaturaRepository {

  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async existeNaoRemovida(estudanteId: number, vagaId: number, tx?: Transacao): Promise<boolean> {

    const resultado = await this.executor(tx).query(
      `SELECT 1 FROM candidatura
        WHERE estudante_id = $1 AND vaga_id = $2 AND status <> 'REMOVIDA'`,
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
    const candidatura = montarCandidatura(resultado.rows[0]);

    // A primeira linha do historico tem a mesma hora da candidatura. Copiada
    // no proprio SQL, para nao depender de como cada driver converte datas.
    await tx.query(
      `INSERT INTO historico_status (candidatura_id, status, ocorrido_em)
       SELECT id, status, criada_em FROM candidatura WHERE id = $1`,
      [candidatura.id]
    );

    return candidatura;

  }

  async buscarParaAtualizacao(id: number, tx: Transacao): Promise<Candidatura | null> {

    const resultado = await tx.query(`SELECT * FROM candidatura WHERE id = $1 FOR UPDATE`, [id]);

    return resultado.rows.length ? montarCandidatura(resultado.rows[0]) : null;

  }

  async atualizar(candidatura: Candidatura, tx: Transacao): Promise<void> {

    await tx.query(
      `UPDATE candidatura SET status = $2, motivo_declinio = $3 WHERE id = $1`,
      [candidatura.id, candidatura.status, candidatura.motivoDeclinio]
    );

  }

  /** A hora vai como texto ISO (UTC): o `pg` e o PGlite leem igual. */
  async registrarHistorico(
    candidaturaId: number,
    status: StatusCandidatura,
    agora: Date,
    tx: Transacao,
    observacao: string | null = null
  ): Promise<void> {

    await tx.query(
      `INSERT INTO historico_status (candidatura_id, status, ocorrido_em, observacao)
            VALUES ($1, $2, $3, $4)`,
      [candidaturaId, status, agora.toISOString(), observacao]
    );

  }

  /**
   * Na ordem em que as linhas foram gravadas, que e a ordem das transicoes:
   * cada uma acontece numa transacao propria, com a candidatura travada. A
   * hora nao serve para ordenar: a primeira linha usa o relogio do banco
   * (criada_em) e as outras, o da aplicacao (agora). Com o banco em outra
   * maquina, uma diferenca de relogio inverteria a linha do tempo.
   */
  async listarHistorico(candidaturaId: number): Promise<HistoricoDeStatus[]> {

    const resultado = await this.executor().query(
      `SELECT * FROM historico_status
        WHERE candidatura_id = $1
        ORDER BY id`,
      [candidaturaId]
    );

    return resultado.rows.map(
      (linha) =>
        new HistoricoDeStatus(
          linha.id,
          linha.candidatura_id,
          linha.status as StatusCandidatura,
          new Date(linha.ocorrido_em),
          linha.observacao ?? null
        )
    );

  }

  async listarDoEstudante(estudanteId: number): Promise<CandidaturaComVaga[]> {

    const resultado = await this.executor().query(
      `${SELECT_COM_VAGA}
        WHERE c.estudante_id = $1 AND c.status <> 'REMOVIDA'
        ORDER BY c.criada_em DESC, c.id DESC`,
      [estudanteId]
    );

    return resultado.rows.map(montarComVaga);

  }

  async buscarDoEstudante(
    estudanteId: number,
    candidaturaId: number
  ): Promise<CandidaturaComVaga | null> {

    const resultado = await this.executor().query(
      `${SELECT_COM_VAGA}
        WHERE c.estudante_id = $1 AND c.id = $2`,
      [estudanteId, candidaturaId]
    );

    return resultado.rows.length ? montarComVaga(resultado.rows[0]) : null;

  }

  /**
   * Os status vao um parametro por valor, como no NotificacaoRepository:
   * funciona igual no `pg` e no PGlite, sem depender de como cada driver
   * converte listas.
   */
  async listarDaCoordenacao(
    coordenadorId: number,
    filtro: FiltroDeCandidaturas
  ): Promise<CandidaturaRecebida[]> {

    const params: unknown[] = [coordenadorId];
    let condicoes = '';

    if (filtro.vagaId) {
      params.push(filtro.vagaId);
      condicoes += ` AND c.vaga_id = $${params.length}`;
    }
    const status = filtro.status ?? [];
    if (status.length > 0) {
      const marcadores = status.map((s) => {

        params.push(s);
        return `$${params.length}`;

      });
      condicoes += ` AND c.status::text IN (${marcadores.join(', ')})`;
    }

    const resultado = await this.executor().query(
      `${SELECT_RECEBIDA} ${condicoes}
        ORDER BY c.criada_em DESC, c.id DESC`,
      params
    );

    return resultado.rows.map(montarRecebida);

  }

  async buscarRecebida(
    coordenadorId: number,
    candidaturaId: number
  ): Promise<CandidaturaRecebida | null> {

    const resultado = await this.executor().query(`${SELECT_RECEBIDA} AND c.id = $2`, [
      coordenadorId,
      candidaturaId
    ]);

    return resultado.rows.length ? montarRecebida(resultado.rows[0]) : null;

  }

  async listarAtivasDoUsuario(usuarioId: number, tx: Transacao): Promise<Candidatura[]> {

    const resultado = await tx.query(
      `SELECT * FROM candidatura
        WHERE estudante_id = $1 AND status IN ('EM_ANALISE', 'ACEITA')
        ORDER BY criada_em, id`,
      [usuarioId]
    );

    return resultado.rows.map(montarCandidatura);

  }

}

function montarCandidatura(linha: any): Candidatura {

  return new Candidatura(
    linha.id,
    linha.vaga_id,
    linha.estudante_id,
    linha.status as StatusCandidatura,
    linha.mensagem ?? null,
    new Date(linha.criada_em),
    linha.motivo_declinio ?? null
  );

}

function montarComVaga(linha: any): CandidaturaComVaga {

  return {
    candidatura: montarCandidatura(linha),
    vagaTitulo: linha.vaga_titulo,
    projetoId: linha.projeto_id,
    projetoNome: linha.projeto_nome,
    coordenadorNome: linha.coordenador_nome ?? ''
  };

}

function montarRecebida(linha: any): CandidaturaRecebida {

  return {
    candidatura: montarCandidatura(linha),
    vagaTitulo: linha.vaga_titulo,
    projetoNome: linha.projeto_nome,
    estudante: new Usuario(
      linha.aluno_id,
      linha.aluno_nome,
      linha.aluno_email,
      linha.aluno_papel as Papel,
      linha.aluno_curso ?? null,
      linha.aluno_semestre ?? null
    )
  };

}
