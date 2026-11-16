import { NaoEncontrado, RegraDeNegocio, SemPermissao } from '../erros';
import { Projeto } from '../entidades/Projeto';
import { Participacao } from '../entidades/Participacao';
import { combinaComLista, combinaComTermo } from '../busca';
import { IUnidadeDeTrabalho, Transacao } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import { IProjetoRepository, ResumoDeProjeto } from '../../persistencia/interfaces/IProjetoRepository';
import { IVagaRepository, VagaComProjeto } from '../../persistencia/interfaces/IVagaRepository';
import {
  AtividadeComProjeto,
  IAtividadeRepository
} from '../../persistencia/interfaces/IAtividadeRepository';
import {
  IParticipacaoRepository,
  ParticipacaoComProjeto,
  Participante
} from '../../persistencia/interfaces/IParticipacaoRepository';

export interface FiltroDeProjetos {
  termo?: string;
  areas?: string[];
  somenteComVagasAbertas?: boolean;
}

/** Tudo o que a Pagina do Projeto mostra (C02). */
export interface DetalheDoProjeto {
  projeto: Projeto;
  coordenadorNome: string | null;
  vagas: VagaComProjeto[];
  atividades: AtividadeComProjeto[];
}

export const CARGO_DO_COORDENADOR = 'Coordenador(a)';

/**
 * C02 - Visualizar Detalhes do Projeto, listagem de projetos, Meus Projetos
 * e gestao dos participantes.
 *
 * As participacoes sao criadas pela dupla A (C07); aqui elas sao lidas e o
 * coordenador pode alterar o cargo ou tirar alguem da equipe.
 */
export class ProjetoService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly projetos: IProjetoRepository,
    private readonly vagas: IVagaRepository,
    private readonly atividades: IAtividadeRepository,
    private readonly participacoes: IParticipacaoRepository
  ) {}

  /** Tela Projetos: busca por nome, descricao, area ou coordenador, e filtro por area. */
  async listar(filtro: FiltroDeProjetos = {}): Promise<ResumoDeProjeto[]> {
    const todos = await this.projetos.listarComCoordenador();
    return todos.filter(
      (item) =>
        combinaComTermo(filtro.termo, [
          item.projeto.nome,
          item.projeto.descricao,
          item.projeto.area,
          item.coordenadorNome ?? item.projeto.coordenadorCadastrado
        ]) &&
        combinaComLista(item.projeto.area, filtro.areas) &&
        (!filtro.somenteComVagasAbertas || item.vagasAbertas > 0)
    );
  }

  /** C02: o projeto, as vagas abertas dele e as atividades postadas. */
  async detalhar(projetoId: number): Promise<DetalheDoProjeto> {
    const resumo = (await this.projetos.listarComCoordenador()).find(
      (item) => item.projeto.id === projetoId
    );
    if (!resumo) {
      throw new NaoEncontrado('Projeto não encontrado.');
    }

    const vagas = (await this.vagas.listarAbertas()).filter(
      (item) => item.vaga.projetoId === projetoId
    );
    const atividades = await this.atividades.listarDoProjeto(projetoId);

    return {
      projeto: resumo.projeto,
      coordenadorNome: resumo.coordenadorNome,
      vagas,
      atividades
    };
  }

  /**
   * Meus Projetos: para o coordenador, os projetos que ele coordena; para
   * quem faz parte de equipes, as participacoes (ativas primeiro).
   */
  async meusProjetos(usuarioId: number): Promise<ParticipacaoComProjeto[]> {
    const coordenados = await this.projetos.listarDoCoordenador(usuarioId);
    const comoCoordenador: ParticipacaoComProjeto[] = coordenados.map((projeto) => ({
      participacao: null,
      projetoId: projeto.id,
      projetoNome: projeto.nome,
      projetoArea: projeto.area,
      projetoIcone: projeto.icone,
      cargo: CARGO_DO_COORDENADOR
    }));

    const comoParticipante = await this.participacoes.listarDoUsuario(usuarioId);
    return [...comoCoordenador, ...comoParticipante];
  }

  /** Equipe atual do projeto. */
  async listarParticipantes(projetoId: number): Promise<Participante[]> {
    const projeto = await this.projetos.buscarPorId(projetoId);
    if (!projeto) {
      throw new NaoEncontrado('Projeto não encontrado.');
    }
    return this.participacoes.listarDoProjeto(projetoId);
  }

  /** O coordenador muda o cargo de alguem da equipe (ex.: Monitora, Desenvolvedor). */
  async alterarCargo(coordenadorId: number, participacaoId: number, cargo: string): Promise<void> {
    await this.unidade.emTransacao(async (tx) => {
      const participacao = await this.participacaoQueOCoordenadorGere(
        coordenadorId,
        participacaoId,
        tx
      );
      participacao.cargo = cargo;
      await this.participacoes.atualizar(participacao, tx);
    });
  }

  /** O coordenador tira alguem da equipe. A participacao fica no historico, encerrada. */
  async removerParticipante(
    coordenadorId: number,
    participacaoId: number,
    agora: Date = new Date()
  ): Promise<void> {
    await this.unidade.emTransacao(async (tx) => {
      const participacao = await this.participacaoQueOCoordenadorGere(
        coordenadorId,
        participacaoId,
        tx
      );
      participacao.encerrar(null, agora);
      await this.participacoes.atualizar(participacao, tx);
    });
  }

  /** A participacao existe, esta ativa e e de um projeto deste coordenador. */
  private async participacaoQueOCoordenadorGere(
    coordenadorId: number,
    participacaoId: number,
    tx: Transacao
  ): Promise<Participacao> {
    const participacao = await this.participacoes.buscarPorId(participacaoId, tx);
    if (!participacao) {
      throw new NaoEncontrado('Participação não encontrada.');
    }
    const projeto = await this.projetos.buscarPorId(participacao.projetoId, tx);
    if (!projeto || !projeto.ehCoordenadoPor({ id: coordenadorId })) {
      throw new SemPermissao('Só o coordenador do projeto pode gerenciar a equipe.');
    }
    if (!participacao.estaAtiva()) {
      throw new RegraDeNegocio('Esta pessoa não faz mais parte da equipe.');
    }
    return participacao;
  }
}
