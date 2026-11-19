import { Usuario, Papel } from '../../dominio/entidades/Usuario';
import { DadosDoPerfil, IUsuarioRepository } from '../interfaces/IUsuarioRepository';
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

  async atualizarPerfil(usuarioId: number, dados: DadosDoPerfil, tx?: Transacao): Promise<void> {
    await this.executor(tx).query(
      `UPDATE usuario
          SET descricao = $2, contato = $3, lattes = $4, linkedin = $5,
              github = $6, pagina_pessoal = $7, curso = $8, semestre = $9
        WHERE id = $1`,
      [
        usuarioId,
        dados.descricao,
        dados.contato,
        dados.lattes,
        dados.linkedin,
        dados.github,
        dados.paginaPessoal,
        dados.curso,
        dados.semestre
      ]
    );
  }
}

function montarUsuario(linha: any): Usuario {
  return new Usuario(
    linha.id,
    linha.nome,
    linha.email,
    linha.papel as Papel,
    linha.curso,
    linha.semestre,
    {
      descricao: linha.descricao ?? '',
      contato: linha.contato ?? '',
      lattes: linha.lattes ?? null,
      linkedin: linha.linkedin ?? null,
      github: linha.github ?? null,
      paginaPessoal: linha.pagina_pessoal ?? null
    }
  );
}
