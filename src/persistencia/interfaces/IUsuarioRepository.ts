import { PerfilDoUsuario, Usuario } from '../../dominio/entidades/Usuario';
import { Transacao } from './IUnidadeDeTrabalho';

/** O que a pessoa muda em Configuracoes do perfil (C16). */
export interface DadosDoPerfil extends PerfilDoUsuario {
  /** So de estudante; para os outros papeis fica sempre vazio. */
  curso: string | null;
  semestre: number | null;
}

export interface IUsuarioRepository {
  buscarPorId(id: number, tx?: Transacao): Promise<Usuario | null>;

  /** Usada apenas pela tela de login simplificado da demonstracao. */
  listarTodos(): Promise<Usuario[]>;

  /** Grava o perfil editado em Configuracoes (C16). */
  atualizarPerfil(usuarioId: number, dados: DadosDoPerfil, tx?: Transacao): Promise<void>;
}
