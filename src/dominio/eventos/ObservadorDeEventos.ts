import { EventoDeDominio } from './EventoDeDominio';

/**
 * Quem quer ser avisado dos eventos do dominio (padrao Observer).
 *
 * Hoje ha um so observador, o NotificadorInApp. Um canal novo, como e-mail,
 * entra como mais uma implementacao desta interface, sem mudar os servicos.
 */
export interface ObservadorDeEventos {
  notificar(evento: EventoDeDominio): Promise<void>;
}
