import { NaoEncontrado, SemPermissao } from '../erros';
import { Atividade, DadosAtividade } from '../entidades/Atividade';
import { combinaComLista, combinaComTermo } from '../busca';
import { evento } from '../eventos/EventoDeDominio';
import { PublicadorDeEventos } from '../eventos/PublicadorDeEventos';
import { IUnidadeDeTrabalho } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import {
  AtividadeComProjeto,
  IAtividadeRepository
} from '../../persistencia/interfaces/IAtividadeRepository';
import { IParticipacaoRepository } from '../../persistencia/interfaces/IParticipacaoRepository';
import { IProjetoRepository } from '../../persistencia/interfaces/IProjetoRepository';

export interface FiltroDeAtividades {
  termo?: string;
  areas?: string[];
}

/**
 * C10 - Postar atividade do projeto, e o feed de atividades.
 */
export class AtividadeService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly atividades: IAtividadeRepository,
    private readonly participacoes: IParticipacaoRepository,
    private readonly projetos: IProjetoRepository,
    private readonly eventos: PublicadorDeEventos
  ) {}

  /** Feed: atividades mais recentes, com busca textual e filtro por area. */
  async listarRecentes(filtro: FiltroDeAtividades = {}): Promise<AtividadeComProjeto[]> {
    const recentes = await this.atividades.listarRecentes();
    return recentes.filter(
      (item) =>
        combinaComTermo(filtro.termo, [
          item.atividade.titulo,
          item.atividade.descricao,
          item.projetoNome,
          item.autorNome
        ]) && combinaComLista(item.projetoArea, filtro.areas)
    );
  }

  /**
   * Fluxo basico do C10.
   *
   * Pre-condicao: o autor e o coordenador do projeto ou faz parte da equipe
   * (participacao ativa). Pos-condicao: a atividade aparece na Pagina do
   * Projeto e no feed, e a equipe e avisada.
   */
  async postar(autorId: number, projetoId: number, dados: DadosAtividade): Promise<Atividade> {
    const atividade = await this.unidade.emTransacao(async (tx) => {
      const projeto = await this.projetos.buscarPorId(projetoId, tx);
      if (!projeto) {
        throw new NaoEncontrado('Projeto não encontrado.');
      }

      const podePostar =
        projeto.ehCoordenadoPor({ id: autorId }) ||
        (await this.participacoes.estaVinculado(autorId, projetoId, tx));
      if (!podePostar) {
        throw new SemPermissao(
          'Só o coordenador e os participantes do projeto podem postar atividades.'
        );
      }

      return this.atividades.inserir(projetoId, autorId, dados, tx);
    });

    // Depois do COMMIT: o aviso nunca fala de uma atividade que nao foi gravada.
    await this.eventos.publicar(evento('ATIVIDADE_POSTADA', atividade.id, autorId));
    return atividade;
  }
}
