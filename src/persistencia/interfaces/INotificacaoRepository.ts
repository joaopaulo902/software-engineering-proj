import {
  Notificacao,
  NovaNotificacao,
  TipoNotificacao
} from '../../dominio/entidades/Notificacao';
import { Transacao } from './IUnidadeDeTrabalho';

export interface INotificacaoRepository {
  inserir(nova: NovaNotificacao, tx?: Transacao): Promise<Notificacao>;

  /** Mais recentes primeiro. Lista de tipos vazia traz todos os tipos. */
  listarDoDestinatario(usuarioId: number, tipos: TipoNotificacao[]): Promise<Notificacao[]>;

  marcarTodasComoLidas(usuarioId: number): Promise<void>;
}
