import { Participacao } from '../../dominio/entidades/Participacao';
import { formatarDia } from '../../dominio/calendario';
import { RegraDeNegocio } from '../../dominio/erros';
import {
  IParticipacaoRepository,
  ParticipacaoComProjeto,
  Participante
} from '../interfaces/IParticipacaoRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class ParticipacaoRepository implements IParticipacaoRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  /**
   * C07 (dupla A). As datas vao como texto: o inicio em ISO (UTC) e o
   * previsto_ate como dia de calendario "AAAA-MM-DD" (ver calendario.ts).
   *
   * O servico confere a equipe antes de inserir, mas duas confirmacoes
   * simultaneas do mesmo estudante no mesmo projeto passam as duas pela
   * conferencia; o indice uq_participacao_ativa barra a segunda. Sem a
   * traducao abaixo, o tratadorDeErros mostraria "Voce ja se candidatou a
   * esta vaga.", que e outra coisa.
   */
  async inserir(participacao: Participacao, tx: Transacao): Promise<Participacao> {
    try {
      const resultado = await tx.query(
        `INSERT INTO participacao
           (projeto_id, usuario_id, candidatura_id, cargo, inicio, previsto_ate)
         VALUES ($1, $2, $3, $4, $5, $6::date)
         RETURNING *`,
        [
          participacao.projetoId,
          participacao.usuarioId,
          participacao.candidaturaId,
          participacao.cargo,
          participacao.inicio.toISOString(),
          participacao.previstoAte ? formatarDia(participacao.previstoAte) : null
        ]
      );
      return montarParticipacao(resultado.rows[0]);
    } catch (erro) {
      const { code, constraint } = erro as { code?: string; constraint?: string };
      if (code === '23505' && constraint === 'uq_participacao_ativa') {
        throw new RegraDeNegocio('Você já faz parte da equipe deste projeto.');
      }
      throw erro;
    }
  }

  async buscarPorId(id: number, tx?: Transacao): Promise<Participacao | null> {
    const resultado = await this.executor(tx).query(
      `SELECT * FROM participacao WHERE id = $1`,
      [id]
    );
    return resultado.rows.length ? montarParticipacao(resultado.rows[0]) : null;
  }

  async listarDoUsuario(usuarioId: number): Promise<ParticipacaoComProjeto[]> {
    const resultado = await this.executor().query(
      `SELECT pa.*,
              p.nome  AS projeto_nome,
              p.area  AS projeto_area,
              p.icone AS projeto_icone
         FROM participacao pa
         JOIN projeto p ON p.id = pa.projeto_id
        WHERE pa.usuario_id = $1
        ORDER BY (pa.fim IS NULL) DESC, pa.inicio DESC`,
      [usuarioId]
    );
    return resultado.rows.map((linha) => {
      const participacao = montarParticipacao(linha);
      return {
        participacao,
        projetoId: participacao.projetoId,
        projetoNome: linha.projeto_nome,
        projetoArea: linha.projeto_area,
        projetoIcone: linha.projeto_icone ?? null,
        cargo: participacao.cargo
      };
    });
  }

  async listarDoProjeto(projetoId: number): Promise<Participante[]> {
    const resultado = await this.executor().query(
      `SELECT pa.*, u.nome AS usuario_nome
         FROM participacao pa
         JOIN usuario u ON u.id = pa.usuario_id
        WHERE pa.projeto_id = $1
          AND pa.fim IS NULL
        ORDER BY u.nome`,
      [projetoId]
    );
    return resultado.rows.map((linha) => ({
      participacao: montarParticipacao(linha),
      nome: linha.usuario_nome
    }));
  }

  async estaVinculado(usuarioId: number, projetoId: number, tx?: Transacao): Promise<boolean> {
    const resultado = await this.executor(tx).query(
      `SELECT 1 FROM participacao
        WHERE usuario_id = $1 AND projeto_id = $2 AND fim IS NULL`,
      [usuarioId, projetoId]
    );
    return resultado.rows.length > 0;
  }

  async atualizar(participacao: Participacao, tx: Transacao): Promise<void> {
    await tx.query(
      `UPDATE participacao
          SET cargo = $2, fim = $3, mensagem_de_saida = $4
        WHERE id = $1`,
      [
        participacao.id,
        participacao.cargo,
        participacao.fim ? participacao.fim.toISOString() : null,
        participacao.mensagemDeSaida
      ]
    );
  }
}

function montarParticipacao(linha: any): Participacao {
  return new Participacao(
    linha.id,
    linha.projeto_id,
    linha.usuario_id,
    linha.candidatura_id ?? null,
    linha.cargo,
    new Date(linha.inicio),
    linha.fim ? new Date(linha.fim) : null,
    // DATE chega como "AAAA-MM-DD" (pg) ou meia-noite UTC (PGlite); ver calendario.ts
    linha.previsto_ate ? new Date(linha.previsto_ate) : null,
    linha.mensagem_de_saida ?? null
  );
}
