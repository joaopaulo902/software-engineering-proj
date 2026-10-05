import { Usuario } from '../../dominio/entidades/Usuario';
import { Transacao } from './IUnidadeDeTrabalho';

export interface IUsuarioRepository {
  buscarPorId(id: number, tx?: Transacao): Promise<Usuario | null>;

  /** Usada apenas pela tela de login simplificado da demonstracao. */
  listarTodos(): Promise<Usuario[]>;
}
