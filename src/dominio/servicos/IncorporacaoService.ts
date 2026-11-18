import { PedidoIncorporacao } from '../entidades/PedidoIncorporacao';
import { Projeto } from '../entidades/Projeto';
import { NaoEncontrado, RegraDeNegocio, SemPermissao } from '../erros';
import { evento } from '../eventos/EventoDeDominio';
import { PublicadorDeEventos } from '../eventos/PublicadorDeEventos';
import { combinaComTermo } from '../busca';
import { IPedidoIncorporacaoRepository, PedidoComProjeto } from '../../persistencia/interfaces/IPedidoIncorporacaoRepository';
import { IProjetoRepository } from '../../persistencia/interfaces/IProjetoRepository';
import { IUnidadeDeTrabalho } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';

export type DecisaoIncorporacao = 'DEFERIDO' | 'INDEFERIDO';

export class IncorporacaoService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly projetos: IProjetoRepository,
    private readonly pedidos: IPedidoIncorporacaoRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly eventos: PublicadorDeEventos
  ) {}

  async listarProjetosDisponiveis(coordenadorId: number, termo?: string): Promise<Projeto[]> {
    const coordenador = await this.usuarios.buscarPorId(coordenadorId);
    if (!coordenador) throw new NaoEncontrado('Usuário não encontrado.');
    if (!coordenador.ehCoordenador()) {
      throw new SemPermissao('Apenas coordenadores podem solicitar incorporação.');
    }
    const projetos = await this.projetos.listarNaoIncorporados();
    return projetos.filter((projeto) =>
      combinaComTermo(termo, [
        projeto.nome,
        projeto.descricao,
        projeto.area,
        projeto.coordenadorCadastrado
      ])
    );
  }

  async solicitar(
    coordenadorId: number,
    projetoId: number,
    mensagem: string | null
  ): Promise<PedidoIncorporacao> {
    if (mensagem && mensagem.length > 1000) {
      throw new RegraDeNegocio('A mensagem deve ter no máximo 1000 caracteres.');
    }

    const pedido = await this.unidade.emTransacao(async (tx) => {
      const coordenador = await this.usuarios.buscarPorId(coordenadorId, tx);
      if (!coordenador) throw new NaoEncontrado('Usuário não encontrado.');
      if (!coordenador.ehCoordenador()) {
        throw new SemPermissao('Apenas coordenadores podem solicitar incorporação.');
      }

      const projeto = await this.projetos.buscarPorId(projetoId, tx);
      if (!projeto) throw new NaoEncontrado('Projeto não encontrado.');
      this.validarDisponibilidade(projeto);

      if (await this.pedidos.existePendente(coordenadorId, projetoId, tx)) {
        throw new RegraDeNegocio('Você já possui um pedido pendente para este projeto.');
      }

      const novoPedido = new PedidoIncorporacao(
        0,
        projetoId,
        coordenadorId,
        mensagem,
        'PENDENTE',
        new Date(),
        null
      );
      const criado = await this.pedidos.inserir(novoPedido, tx);
      if (!criado) {
        throw new RegraDeNegocio('Você já possui um pedido pendente para este projeto.');
      }
      return criado;
    });

    await this.eventos.publicar(evento('INCORPORACAO_SOLICITADA', pedido.id, coordenadorId));
    return pedido;
  }

  async listarPendentes(administradorId: number): Promise<PedidoComProjeto[]> {
    await this.validarAdministrador(administradorId);
    return this.pedidos.listarPendentes();
  }

  async listarPendentesDoCoordenador(coordenadorId: number): Promise<PedidoComProjeto[]> {
    const coordenador = await this.usuarios.buscarPorId(coordenadorId);
    if (!coordenador) throw new NaoEncontrado('Usuário não encontrado.');
    if (!coordenador.ehCoordenador()) {
      throw new SemPermissao('Apenas coordenadores podem consultar seus pedidos de incorporação.');
    }
    return this.pedidos.listarPendentesDoCoordenador(coordenadorId);
  }

  async avaliar(
    administradorId: number,
    pedidoId: number,
    decisao: DecisaoIncorporacao
  ): Promise<PedidoIncorporacao> {
    const pedido = await this.unidade.emTransacao(async (tx) => {
      const administrador = await this.usuarios.buscarPorId(administradorId, tx);
      if (!administrador) throw new NaoEncontrado('Usuário não encontrado.');
      if (!administrador.ehAdministrador()) {
        throw new SemPermissao('Apenas administradores podem avaliar pedidos de incorporação.');
      }

      const atual = await this.pedidos.buscarParaAtualizacao(pedidoId, tx);
      if (!atual) throw new NaoEncontrado('Pedido de incorporação não encontrado.');
      if (atual.status !== 'PENDENTE') {
        throw new RegraDeNegocio('Este pedido de incorporação já foi avaliado.');
      }

      if (decisao === 'DEFERIDO') {
        const vinculou = await this.projetos.definirCoordenador(
          atual.projetoId,
          atual.coordenadorId,
          tx
        );
        if (!vinculou) {
          throw new RegraDeNegocio('O projeto já foi incorporado ou não está ativo.');
        }
        atual.deferir(new Date());
      } else {
        atual.indeferir(new Date());
      }
      await this.pedidos.atualizar(atual, tx);
      return atual;
    });

    await this.eventos.publicar(evento('INCORPORACAO_AVALIADA', pedido.id, administradorId));
    return pedido;
  }

  private async validarAdministrador(administradorId: number): Promise<void> {
    const administrador = await this.usuarios.buscarPorId(administradorId);
    if (!administrador) throw new NaoEncontrado('Usuário não encontrado.');
    if (!administrador.ehAdministrador()) {
      throw new SemPermissao('Apenas administradores podem acessar os pedidos de incorporação.');
    }
  }

  private validarDisponibilidade(projeto: Projeto): void {
    if (projeto.estaIncorporado()) {
      throw new RegraDeNegocio('Este projeto já foi incorporado.');
    }
    if (projeto.situacao !== 'ATIVO') {
      throw new RegraDeNegocio('Este projeto não está ativo para incorporação.');
    }
  }
}
