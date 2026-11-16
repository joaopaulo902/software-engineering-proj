import { EventoDeDominio } from './EventoDeDominio';
import { ObservadorDeEventos } from './ObservadorDeEventos';

/**
 * Sujeito do padrao Observer: guarda os observadores e entrega cada evento
 * a todos eles.
 *
 * Os servicos publicam DEPOIS do COMMIT, fora de `emTransacao`. Assim um
 * aviso nunca fala de algo que acabou desfeito por ROLLBACK, e uma falha ao
 * avisar nunca desfaz o caso de uso: o erro do observador vai para o log e
 * os demais observadores continuam recebendo o evento.
 *
 * Uso num servico:
 *
 *   const candidatura = await this.unidade.emTransacao(async (tx) => { ... });
 *   await this.eventos.publicar(evento('CANDIDATURA_CRIADA', candidatura.id, estudanteId));
 */
export class PublicadorDeEventos {
  private readonly observadores: ObservadorDeEventos[] = [];

  inscrever(observador: ObservadorDeEventos): void {
    if (!this.observadores.includes(observador)) {
      this.observadores.push(observador);
    }
  }

  async publicar(evento: EventoDeDominio): Promise<void> {
    for (const observador of this.observadores) {
      try {
        await observador.notificar(evento);
      } catch (erro) {
        console.error(`[eventos] falha ao avisar sobre ${evento.tipo} #${evento.origemId}`, erro);
      }
    }
  }
}
