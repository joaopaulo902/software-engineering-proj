import { NextFunction, Request, Response } from 'express';
import { IncorporacaoService } from '../../dominio/servicos/IncorporacaoService';
import { Projeto } from '../../dominio/entidades/Projeto';
import { PedidoIncorporacao } from '../../dominio/entidades/PedidoIncorporacao';
import { DecisaoIncorporacao } from '../../dominio/servicos/IncorporacaoService';
import { lerId, lerTexto } from '../parametros';

export class IncorporacaoController {
  constructor(private readonly servico: IncorporacaoService) {}

  listarProjetosDisponiveis = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const projetos = await this.servico.listarProjetosDisponiveis(
        req.session.usuarioId as number,
        lerTexto(req.query.termo)
      );
      res.json(projetos.map(apresentarProjeto));
    } catch (erro) {
      next(erro);
    }
  };

  solicitar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projetoId = lerId(req.body?.projetoId);
      if (!projetoId) {
        res.status(400).json({ erro: 'Projeto inválido.' });
        return;
      }
      const mensagem = lerTexto(req.body?.mensagem) ?? null;
      if (mensagem && mensagem.length > 1000) {
        res.status(400).json({ erro: 'A mensagem deve ter no máximo 1000 caracteres.' });
        return;
      }

      const pedido = await this.servico.solicitar(
        req.session.usuarioId as number,
        projetoId,
        mensagem
      );
      res.status(201).json(apresentarPedido(pedido));
    } catch (erro) {
      next(erro);
    }
  };

  listarPendentes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pedidos = await this.servico.listarPendentes(_req.session.usuarioId as number);
      res.json(
        pedidos.map(({ pedido, projeto, coordenadorNome }) => ({
          ...apresentarPedido(pedido),
          projeto: apresentarProjeto(projeto),
          coordenadorNome
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  listarMinhasPendentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pedidos = await this.servico.listarPendentesDoCoordenador(
        req.session.usuarioId as number
      );
      res.json(
        pedidos.map(({ pedido, projeto }) => ({
          ...apresentarPedido(pedido),
          projeto: apresentarProjeto(projeto)
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  avaliar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pedidoId = lerId(req.params.id);
      if (!pedidoId) {
        res.status(400).json({ erro: 'Pedido de incorporação inválido.' });
        return;
      }
      const decisao = req.body?.decisao;
      if (decisao !== 'DEFERIDO' && decisao !== 'INDEFERIDO') {
        res.status(400).json({ erro: 'A decisão deve ser DEFERIDO ou INDEFERIDO.' });
        return;
      }

      const pedido = await this.servico.avaliar(
        req.session.usuarioId as number,
        pedidoId,
        decisao as DecisaoIncorporacao
      );
      res.json(apresentarPedido(pedido));
    } catch (erro) {
      next(erro);
    }
  };
}

function apresentarProjeto(projeto: Projeto) {
  return {
    id: projeto.id,
    nome: projeto.nome,
    descricao: projeto.descricao,
    area: projeto.area,
    icone: projeto.icone,
    situacao: projeto.situacao,
    coordenadorCadastrado: projeto.coordenadorCadastrado
  };
}

function apresentarPedido(pedido: PedidoIncorporacao) {
  return {
    id: pedido.id,
    projetoId: pedido.projetoId,
    coordenadorId: pedido.coordenadorId,
    mensagem: pedido.mensagem,
    status: pedido.status,
    solicitadoEm: pedido.solicitadoEm,
    avaliadoEm: pedido.avaliadoEm
  };
}
