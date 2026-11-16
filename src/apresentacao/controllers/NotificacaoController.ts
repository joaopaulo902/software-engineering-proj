import { Request, Response, NextFunction } from 'express';
import { NotificacaoService } from '../../dominio/servicos/NotificacaoService';
import { TIPOS_DE_NOTIFICACAO, TipoNotificacao } from '../../dominio/entidades/Notificacao';
import { lerLista } from '../parametros';

export class NotificacaoController {
  constructor(private readonly servico: NotificacaoService) {}

  /**
   * GET /api/notificacoes?tipos=NOVA_CANDIDATURA,NOVA_ATIVIDADE
   *
   * O contador do sino e a quantidade de itens com `lida: false`.
   */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tipos = lerLista(req.query.tipos);
      const invalido = tipos.find((t) => !TIPOS_DE_NOTIFICACAO.includes(t as TipoNotificacao));
      if (invalido) {
        res.status(400).json({ erro: `Tipo de notificação desconhecido: ${invalido}.` });
        return;
      }

      const lista = await this.servico.listarDoUsuario(
        req.session.usuarioId as number,
        tipos as TipoNotificacao[]
      );
      res.json(
        lista.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          texto: n.texto,
          referenciaId: n.referenciaId,
          lida: n.lida,
          criadaEm: n.criadaEm
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  /** POST /api/notificacoes/lidas - zera o contador do sino */
  marcarLidas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.servico.marcarComoLidas(req.session.usuarioId as number);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  };
}
