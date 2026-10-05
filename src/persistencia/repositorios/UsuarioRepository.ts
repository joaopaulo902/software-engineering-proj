import { Usuario, Papel } from '../../dominio/entidades/Usuario';
import { IUsuarioRepository } from '../interfaces/IUsuarioRepository';
import { Transacao } from '../interfaces/IUnidadeDeTrabalho';

export class UsuarioRepository implements IUsuarioRepository {
  constructor(private readonly db: Transacao) {}

  private executor(tx?: Transacao): Transacao {
    return tx ?? this.db;
  }

  async buscarPorId(id: number, tx?: Transacao): Promise<Usuario | null> {
    const resultado = await this.executor(tx).query(`SELECT * FROM usuario WHERE id = $1`, [id]);
    return resultado.rows.length ? montarUsuario(resultado.rows[0]) : null;
  }

  async listarTodos(): Promise<Usuario[]> {
    const resultado = await this.executor().query(
      `SELECT * FROM usuario ORDER BY papel, nome`
    );
    return resultado.rows.map(montarUsuario);
  }
}

function montarUsuario(linha: any): Usuario {
  return new Usuario(
    linha.id,
    linha.nome,
    linha.email,
    linha.papel as Papel,
    linha.curso,
    linha.semestre
  );
}
