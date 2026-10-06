import { Projeto } from '../../dominio/entidades/Projeto';
import { IProjetoRepository } from '../interfaces/IProjetoRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class ProjetoRepository implements IProjetoRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async buscarPorId(id: number, tx?: Transacao): Promise<Projeto | null> {
    const resultado = await this.executor(tx).query(`SELECT * FROM projeto WHERE id = $1`, [id]);
    return resultado.rows.length ? montarProjeto(resultado.rows[0]) : null;
  }

  async listarDoCoordenador(coordenadorId: number): Promise<Projeto[]> {
    const resultado = await this.executor().query(
      `SELECT * FROM projeto WHERE coordenador_id = $1 ORDER BY nome`,
      [coordenadorId]
    );
    return resultado.rows.map(montarProjeto);
  }
}

function montarProjeto(linha: any): Projeto {
  return new Projeto(linha.id, linha.nome, linha.descricao, linha.area, linha.coordenador_id);
}
