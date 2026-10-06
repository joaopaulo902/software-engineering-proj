import { NaoEncontrado, RegraDeNegocio, SemPermissao } from '../erros';
import { DadosNovaVaga, Vaga } from '../entidades/Vaga';
import { Projeto } from '../entidades/Projeto';
import { Usuario } from '../entidades/Usuario';
import { IUnidadeDeTrabalho, Transacao } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import { IVagaRepository, VagaComProjeto } from '../../persistencia/interfaces/IVagaRepository';
import { IProjetoRepository } from '../../persistencia/interfaces/IProjetoRepository';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';

/**
 * C01 - Consultar e Filtrar Vagas de Extensao.
 * C06 - Publicar Vaga de Projeto.
 *
 * O C01 esta implementado parcialmente: busca textual e filtro por area sobre
 * as vagas abertas. O C06 alimenta o C01: a vaga que o coordenador publica e
 * a que o estudante passa a encontrar na busca.
 */
export class VagaService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly vagas: IVagaRepository,
    private readonly projetos: IProjetoRepository,
    private readonly usuarios: IUsuarioRepository
  ) {}

  async listarAbertas(termo?: string, area?: string): Promise<VagaComProjeto[]> {
    const abertas = await this.vagas.listarAbertas();

    const termoNormalizado = normalizar(termo);
    const areaNormalizada = normalizar(area);

    return abertas.filter((item) => {
      const combinaArea = !areaNormalizada || normalizar(item.projetoArea) === areaNormalizada;

      const combinaTermo =
        !termoNormalizado ||
        normalizar(item.vaga.titulo).includes(termoNormalizado) ||
        normalizar(item.vaga.requisitos).includes(termoNormalizado) ||
        normalizar(item.projetoNome).includes(termoNormalizado);

      return combinaArea && combinaTermo;
    });
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
      return this.vagas.inserir(dados, tx);
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

/** Minusculas e sem acento, para a busca achar "extensao" quando o titulo tem "extensão". */
function normalizar(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
