import { NaoEncontrado, RegraDeNegocio, SemPermissao } from '../erros';
import { DadosNovaVaga, Vaga } from '../entidades/Vaga';
import { Projeto } from '../entidades/Projeto';
import { Usuario } from '../entidades/Usuario';
import { IUnidadeDeTrabalho, Transacao } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import { IVagaRepository, VagaComProjeto } from '../../persistencia/interfaces/IVagaRepository';
import { IProjetoRepository } from '../../persistencia/interfaces/IProjetoRepository';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';
import { combinaComLista, combinaComTermo } from '../busca';

/** Como ordenar o resultado do C01. */
export type CriterioDeOrdenacao = 'PRAZO' | 'PUBLICACAO' | 'CARGA_HORARIA';
export const CRITERIOS_DE_ORDENACAO: readonly CriterioDeOrdenacao[] = ['PRAZO', 'PUBLICACAO', 'CARGA_HORARIA'];

/** Os filtros do C01 (FiltroDeVagas no diagrama). Tudo opcional. */
export interface FiltroDeVagas {
  /** Procura no titulo, descricao, requisitos, projeto, coordenador e areas. */
  termo?: string;
  areas?: string[];
  turnos?: string[];
  modalidades?: string[];
  /** Horas por semana; vagas com carga maior ficam de fora. */
  cargaHorariaMaxima?: number;
  /** Padrao: PRAZO (encerra antes, aparece antes). */
  ordenarPor?: CriterioDeOrdenacao;
}

/** O que a tela Detalhes da Vaga (C03) mostra. */
export interface DetalheDaVaga {
  vaga: VagaComProjeto;
  /**
   * Por que QUEM ESTA VENDO nao pode se candidatar, ou null se pode.
   * A tela desabilita o botao "Candidatar-se" e mostra este texto.
   */
  motivoDeInelegibilidade: string | null;
}

/**
 * C01 - Consultar e Filtrar Vagas de Extensao.
 * C06 - Publicar Vaga de Projeto.
 *
 * O C01 filtra as vagas abertas por texto, areas, turnos, modalidades e carga
 * horaria maxima, e ordena. O C06 alimenta o C01: a vaga que o coordenador
 * publica e a que o estudante passa a encontrar na busca.
 */
export class VagaService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly vagas: IVagaRepository,
    private readonly projetos: IProjetoRepository,
    private readonly usuarios: IUsuarioRepository
  ) {}

  /**
   * C01: as vagas abertas que passam em todos os filtros informados.
   * Filtro vazio (ou lista vazia) nao restringe nada. Dentro de uma mesma
   * lista vale qualquer um dos valores: areas ['Saude', 'Educacao'] traz as
   * vagas de Saude OU de Educacao.
   */
  async listarAbertas(filtro: FiltroDeVagas = {}): Promise<VagaComProjeto[]> {
    const abertas = await this.vagas.listarAbertas();

    const encontradas = abertas.filter(({ vaga, projetoNome, projetoArea, coordenadorNome }) => {
      const combinaTermo = combinaComTermo(filtro.termo, [
        vaga.titulo,
        vaga.descricao,
        vaga.requisitos,
        projetoNome,
        coordenadorNome,
        ...vaga.areasTematicas
      ]);
      // A area da vaga sao as areas tematicas dela; a do projeto vale junto,
      // para vagas antigas que so tinham a area do projeto.
      const areas = filtro.areas ?? [];
      const combinaArea =
        areas.length === 0 ||
        [...vaga.areasTematicas, projetoArea].some((area) => combinaComLista(area, areas));
      const combinaTurno = combinaComLista(vaga.turno, filtro.turnos);
      const combinaModalidade = combinaComLista(vaga.modalidade, filtro.modalidades);
      const combinaCarga =
        filtro.cargaHorariaMaxima === undefined || vaga.cargaHoraria <= filtro.cargaHorariaMaxima;

      return combinaTermo && combinaArea && combinaTurno && combinaModalidade && combinaCarga;
    });

    return ordenar(encontradas, filtro.ordenarPor ?? 'PRAZO');
  }

  /**
   * C03 - Visualizar Detalhes da Vaga. Qualquer usuario logado ve qualquer
   * vaga, aberta ou encerrada (a Minha Candidatura aponta para vagas antigas).
   * O motivo vem da mesma regra que o C04 usa para recusar a candidatura.
   */
  async detalhar(vagaId: number, usuarioId: number, agora: Date = new Date()): Promise<DetalheDaVaga> {
    const vaga = await this.vagas.buscarComProjeto(vagaId);
    if (!vaga) {
      throw new NaoEncontrado('Vaga não encontrada.');
    }
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NaoEncontrado('Usuário não encontrado.');
    }
    return { vaga, motivoDeInelegibilidade: vaga.vaga.motivoDeInelegibilidade(usuario, agora) };
  }

  async buscarPorId(id: number): Promise<Vaga> {
    const vaga = await this.vagas.buscarPorId(id);
    if (!vaga) {
      throw new NaoEncontrado('Vaga não encontrada.');
    }
    return vaga;
  }

  /** C06, passo 2: os projetos em que este coordenador pode publicar vagas. */
  async projetosParaPublicar(usuarioId: number): Promise<Projeto[]> {
    const coordenador = await this.exigirCoordenador(usuarioId);
    return this.projetos.listarDoCoordenador(coordenador.id);
  }

  /**
   * Fluxo basico do C06.
   *
   * As verificacoes e a gravacao acontecem na mesma transacao: se qualquer
   * regra recusar, nenhuma vaga e gravada.
   */
  async publicar(
    usuarioId: number,
    dados: DadosNovaVaga,
    agora: Date = new Date()
  ): Promise<Vaga> {
    return this.unidade.emTransacao(async (tx) => {
      // 1. Quem esta publicando. O ator do C06 e o Coordenador.
      const coordenador = await this.exigirCoordenador(usuarioId, tx);

      // 2. Pre-condicao: o projeto foi cadastrado pela Comissao de Extensao.
      const projeto = await this.projetos.buscarPorId(dados.projetoId, tx);
      if (!projeto) {
        throw new NaoEncontrado('Projeto não encontrado.');
      }
      if (!projeto.ehCoordenadoPor(coordenador)) {
        throw new SemPermissao('Você só pode publicar vagas nos projetos que coordena.');
      }

      // 3. Pos-condicao: a vaga precisa nascer aberta a candidaturas. Quem
      //    responde e a propria entidade, com as MESMAS regras que o C04 usa
      //    para aceitar ou recusar um estudante. Nao existe uma segunda versao
      //    da regra de prazo escrita aqui.
      const nova = Vaga.nova(dados);
      if (!nova.temPosicaoDisponivel()) {
        throw new RegraDeNegocio('A vaga precisa oferecer pelo menos uma posição.');
      }
      if (!nova.prazoAberto(agora)) {
        throw new RegraDeNegocio('A data de encerramento não pode ser anterior a hoje.');
      }

      // 4. Grava. A partir daqui a vaga aparece no C01 e aceita o C04.
      //    Sem area tematica informada, vale a area do projeto.
      const areasTematicas = dados.areasTematicas.length ? dados.areasTematicas : [projeto.area];
      return this.vagas.inserir({ ...dados, areasTematicas }, tx);
    });
  }

  private async exigirCoordenador(usuarioId: number, tx?: Transacao): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorId(usuarioId, tx);
    if (!usuario) {
      throw new NaoEncontrado('Usuário não encontrado.');
    }
    if (!usuario.ehCoordenador()) {
      throw new SemPermissao('Apenas coordenadores podem publicar vagas.');
    }
    return usuario;
  }
}

/**
 * PRAZO: encerra antes primeiro. PUBLICACAO: mais nova primeiro.
 * CARGA_HORARIA: menos horas por semana primeiro. Empate: titulo.
 */
function ordenar(itens: VagaComProjeto[], criterio: CriterioDeOrdenacao): VagaComProjeto[] {
  const chave = (item: VagaComProjeto): number => {
    switch (criterio) {
      case 'PUBLICACAO':
        return -item.vaga.publicadaEm.getTime();
      case 'CARGA_HORARIA':
        return item.vaga.cargaHoraria;
      default:
        return item.vaga.dataEncerramento.getTime();
    }
  };
  return [...itens].sort(
    (a, b) => chave(a) - chave(b) || a.vaga.titulo.localeCompare(b.vaga.titulo, 'pt-BR')
  );
}
