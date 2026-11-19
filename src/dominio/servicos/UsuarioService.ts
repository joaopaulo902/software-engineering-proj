import { NaoAutenticado, NaoEncontrado, RegraDeNegocio } from '../erros';
import { Usuario } from '../entidades/Usuario';
import { CARGO_DO_COORDENADOR } from './ProjetoService';
import { IUnidadeDeTrabalho } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import { DadosDoPerfil, IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';
import { IProjetoRepository } from '../../persistencia/interfaces/IProjetoRepository';
import {
  IParticipacaoRepository,
  ParticipacaoComProjeto
} from '../../persistencia/interfaces/IParticipacaoRepository';

/** Tudo o que a tela de Perfil mostra (C16). */
export interface PerfilCompleto {
  usuario: Usuario;
  /** O perfil e de quem esta vendo: a tela mostra Configuracoes. */
  ehProprio: boolean;
  /** Falso esconde o e-mail (ver Usuario.emailVisivelPara). */
  emailVisivel: boolean;
  /** Projetos que coordena e participacoes (ativas primeiro, depois as encerradas). */
  projetos: ParticipacaoComProjeto[];
}

/**
 * C16 - Visualizar e editar perfil.
 *
 * Qualquer pessoa logada ve o perfil de qualquer outra; so o e-mail depende
 * de quem ve. Cada um edita apenas o proprio perfil.
 */
export class UsuarioService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly usuarios: IUsuarioRepository,
    private readonly projetos: IProjetoRepository,
    private readonly participacoes: IParticipacaoRepository
  ) {}

  async perfil(usuarioId: number, visitanteId: number): Promise<PerfilCompleto> {
    const visitante = await this.usuarios.buscarPorId(visitanteId);
    if (!visitante) {
      throw new NaoAutenticado('Entre no sistema para ver perfis.');
    }
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NaoEncontrado('Usuário não encontrado.');
    }

    const coordenados = await this.projetos.listarDoCoordenador(usuario.id);
    const participacoes = await this.participacoes.listarDoUsuario(usuario.id);
    const projetos: ParticipacaoComProjeto[] = [
      ...coordenados.map((projeto) => ({
        participacao: null,
        projetoId: projeto.id,
        projetoNome: projeto.nome,
        projetoArea: projeto.area,
        projetoIcone: projeto.icone,
        cargo: CARGO_DO_COORDENADOR
      })),
      ...participacoes
    ];

    return {
      usuario,
      ehProprio: usuario.id === visitante.id,
      emailVisivel: usuario.emailVisivelPara(visitante),
      projetos
    };
  }

  /**
   * Configuracoes do perfil. O formato dos campos (tamanho, links http) ja
   * chega conferido pelo controller; aqui ficam as regras que dependem de
   * quem e a pessoa: curso e semestre sao do estudante, e ele precisa dos
   * dois para se candidatar (Vaga.motivoDeInelegibilidade).
   */
  async atualizarPerfil(usuarioId: number, dados: DadosDoPerfil): Promise<Usuario> {
    await this.unidade.emTransacao(async (tx) => {
      const usuario = await this.usuarios.buscarPorId(usuarioId, tx);
      if (!usuario) {
        throw new NaoAutenticado('Entre no sistema para editar o perfil.');
      }

      if (usuario.ehEstudante()) {
        if (!dados.curso || dados.semestre === null) {
          throw new RegraDeNegocio('Informe o curso e o semestre: as vagas usam os dois para a candidatura.');
        }
      } else if (dados.curso || dados.semestre !== null) {
        throw new RegraDeNegocio('Curso e semestre fazem parte apenas do perfil de estudante.');
      }

      await this.usuarios.atualizarPerfil(usuarioId, dados, tx);
    });

    return (await this.usuarios.buscarPorId(usuarioId)) as Usuario;
  }
}
