import { Notificacao, TipoNotificacao } from '../entidades/Notificacao';
import { INotificacaoRepository } from '../../persistencia/interfaces/INotificacaoRepository';

/**
 * Tela de Notificacoes e contador do sino.
 *
 * Quem GRAVA os avisos e o NotificadorInApp, ao receber os eventos do
 * dominio. Este servico so le e marca como lidos os avisos do proprio usuario.
 */
export class NotificacaoService {
  constructor(private readonly notificacoes: INotificacaoRepository) {}

  /** Avisos do usuario, mais recentes primeiro. Sem tipos, traz todos. */
  async listarDoUsuario(usuarioId: number, tipos: TipoNotificacao[] = []): Promise<Notificacao[]> {
    return this.notificacoes.listarDoDestinatario(usuarioId, tipos);
  }

  /** Zera o contador do sino. */
  async marcarComoLidas(usuarioId: number): Promise<void> {
    await this.notificacoes.marcarTodasComoLidas(usuarioId);
  }
}
