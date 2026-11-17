import { Atividade, DadosAtividade } from '../../dominio/entidades/Atividade';
import { AtividadeComProjeto, IAtividadeRepository } from '../interfaces/IAtividadeRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

/** Quantas atividades o feed traz. Sem paginacao: o volume da demonstracao nao exige. */
const LIMITE_DO_FEED = 50;

const SELECT_COM_PROJETO = `
  SELECT a.*,
         p.nome AS projeto_nome,
         p.area AS projeto_area,
         u.nome AS autor_nome
    FROM atividade a
    JOIN projeto p ON p.id = a.projeto_id
    JOIN usuario u ON u.id = a.autor_id`;

export class AtividadeRepository implements IAtividadeRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async buscarPorId(id: number): Promise<Atividade | null> {
    const resultado = await this.executor().query(`SELECT * FROM atividade WHERE id = $1`, [id]);
    return resultado.rows.length ? montarAtividade(resultado.rows[0]) : null;
  }

  async listarRecentes(): Promise<AtividadeComProjeto[]> {
    const resultado = await this.executor().query(
      `${SELECT_COM_PROJETO}
        ORDER BY a.publicada_em DESC, a.id DESC
        LIMIT ${LIMITE_DO_FEED}`
    );
    return resultado.rows.map(montarComProjeto);
  }

  async listarDoProjeto(projetoId: number): Promise<AtividadeComProjeto[]> {
    const resultado = await this.executor().query(
      `${SELECT_COM_PROJETO}
        WHERE a.projeto_id = $1
        ORDER BY a.publicada_em DESC, a.id DESC`,
      [projetoId]
    );
    return resultado.rows.map(montarComProjeto);
  }

  async inserir(
    projetoId: number,
    autorId: number,
    dados: DadosAtividade,
    tx: Transacao
  ): Promise<Atividade> {
    const resultado = await tx.query(
      `INSERT INTO atividade (projeto_id, autor_id, titulo, descricao, foto_url)
            VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
      [projetoId, autorId, dados.titulo, dados.descricao, dados.foto]
    );
    return montarAtividade(resultado.rows[0]);
  }
}

function montarAtividade(linha: any): Atividade {
  return new Atividade(
    linha.id,
    linha.projeto_id,
    linha.autor_id,
    linha.titulo,
    linha.descricao,
    linha.foto_url ?? null,
    new Date(linha.publicada_em)
  );
}

function montarComProjeto(linha: any): AtividadeComProjeto {
  return {
    atividade: montarAtividade(linha),
    projetoNome: linha.projeto_nome,
    projetoArea: linha.projeto_area,
    autorNome: linha.autor_nome
  };
}
