import { api } from '../servicos-api.js';
import { escapar } from '../componentes/base.js';
import { abrirNotificacao, renderizarNotificacao } from '../componentes/notificacoes.js';
import { definirContadorDoSino } from '../componentes/estrutura.js';

export async function mostrar(conteudo) {
  conteudo.innerHTML = `
    <section class="card pagina-notificacoes" aria-label="Todas as notificações">
      <header class="pagina-notificacoes__topo">
        <h2>Histórico completo</h2>
        <button type="button" class="botao botao--texto" data-marcar-notificacoes-lidas>
          Marcar todas como lidas
        </button>
      </header>
      <div class="pagina-notificacoes__lista" data-lista-notificacoes aria-live="polite">
        <p class="carregando">Carregando notificações…</p>
      </div>
    </section>`;

  const lista = conteudo.querySelector('[data-lista-notificacoes]');
  const marcarLidas = conteudo.querySelector('[data-marcar-notificacoes-lidas]');

  async function carregar() {
    lista.innerHTML = '<p class="carregando">Carregando notificações…</p>';
    try {
      const notificacoes = await api.notificacoes();
      lista.innerHTML = notificacoes.length
        ? notificacoes.map(renderizarNotificacao).join('')
        : '<p class="aviso aviso--info">Você ainda não recebeu notificações.</p>';
      definirContadorDoSino(notificacoes.filter((notificacao) => !notificacao.lida).length);
    } catch (erro) {
      lista.innerHTML = `<p class="aviso aviso--erro">${escapar(erro.message || 'Não foi possível carregar notificações.')}</p>`;
    }
  }

  marcarLidas.addEventListener('click', async () => {
    marcarLidas.disabled = true;
    try {
      await api.marcarNotificacoesLidas();
      definirContadorDoSino(0);
      await carregar();
    } catch (erro) {
      lista.innerHTML = `<p class="aviso aviso--erro">${escapar(erro.message || 'Não foi possível marcar as notificações como lidas.')}</p>`;
    } finally {
      marcarLidas.disabled = false;
    }
  });

  lista.addEventListener('click', (evento) => {
    const item = evento.target.closest('[data-notificacao]');
    if (item) abrirNotificacao({ tipo: item.dataset.tipo, referenciaId: item.dataset.referencia });
  });

  await carregar();
}
