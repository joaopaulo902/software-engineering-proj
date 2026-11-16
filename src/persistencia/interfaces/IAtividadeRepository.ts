import { Atividade, DadosAtividade } from '../../dominio/entidades/Atividade';
import { Transacao } from './IUnidadeDeTrabalho';

/** Atividade com o projeto e o autor, para o feed e a Pagina do Projeto. */
export interface AtividadeComProjeto {
  atividade: Atividade;
  projetoNome: string;
  projetoArea: string;
  autorNome: string;
}

export interface IAtividadeRepository {
  buscarPorId(id: number): Promise<Atividade | null>;

  /** As mais recentes de todos os projetos, para o feed. */
  listarRecentes(): Promise<AtividadeComProjeto[]>;

  listarDoProjeto(projetoId: number): Promise<AtividadeComProjeto[]>;

  inserir(
    projetoId: number,
    autorId: number,
    dados: DadosAtividade,
    tx: Transacao
  ): Promise<Atividade>;
}
