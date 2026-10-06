import { Projeto } from '../../dominio/entidades/Projeto';
import { Transacao } from './IUnidadeDeTrabalho';

export interface IProjetoRepository {
  buscarPorId(id: number, tx?: Transacao): Promise<Projeto | null>;

  /** Projetos que este usuario coordena, para o formulario do C06. */
  listarDoCoordenador(coordenadorId: number): Promise<Projeto[]>;
}
