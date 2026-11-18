// Pacote `componentes` do subsistema Cliente Web.
// O popup dos prototipos: titulo, X para fechar, corpo e os botoes no rodape.
//
// Usa o <dialog> do navegador, que ja cuida de prender o foco dentro do popup
// e de fechar com Esc.

import { escapar, aviso } from './base.js';

/**
 * Abre um popup e devolve uma Promise:
 *   - com o que `aoConfirmar` devolveu, quando a acao deu certo;
 *   - com `null`, quando o usuario cancelou ou fechou.
 *
 * opcoes:
 *   titulo           texto do topo
 *   corpo            HTML do miolo (texto fixo ou campos de formulario)
 *   rotuloConfirmar  texto do botao da acao; use o mesmo nome do botao que abriu o popup
 *   rotuloCancelar   texto do botao de saida (padrao: "Cancelar")
 *   perigo           true pinta o botao da acao de vermelho (remover, recusar, declinar)
 *   aoConfirmar      funcao async que recebe o <dialog> (para ler os campos do corpo).
 *                    Se lancar erro, a mensagem aparece dentro do popup e ele continua
 *                    aberto, para o usuario corrigir e tentar de novo.
 *                    Sem `aoConfirmar`, o popup e so de leitura e mostra apenas "Fechar".
 */
export function abrirPopup({
  titulo,
  corpo = '',
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  perigo = false,
  aoConfirmar = null
}) {
  return new Promise((resolver) => {
    const popup = document.createElement('dialog');
    popup.className = 'popup';
    popup.innerHTML = `
      <form class="popup__caixa" method="dialog" novalidate>
        <header class="popup__topo">
          <h2>${escapar(titulo)}</h2>
          <button type="button" class="popup__fechar" data-fechar aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </header>
        <div class="popup__corpo">${corpo}</div>
        <div class="retorno" data-erro role="alert"></div>
        <footer class="popup__acoes">
          <button type="button" class="botao" data-fechar>
            ${escapar(aoConfirmar ? rotuloCancelar : 'Fechar')}
          </button>
          ${
            aoConfirmar
              ? `<button type="submit" class="botao ${perigo ? 'botao--perigo' : 'botao--primario'}">
                   ${escapar(rotuloConfirmar)}
                 </button>`
              : ''
          }
        </footer>
      </form>`;

    let resultado = null;
    const erro = popup.querySelector('[data-erro]');
    const botaoDaAcao = popup.querySelector('button[type="submit"]');

    popup.querySelectorAll('[data-fechar]').forEach((botao) => {
      botao.addEventListener('click', () => popup.close());
    });

    // Clique fora da caixa fecha, como nos prototipos.
    popup.addEventListener('click', (evento) => {
      if (evento.target === popup) popup.close();
    });

    popup.querySelector('form').addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (!aoConfirmar) return;

      erro.innerHTML = '';
      botaoDaAcao.disabled = true;
      try {
        resultado = (await aoConfirmar(popup)) ?? true;
        popup.close();
      } catch (falha) {
        erro.innerHTML = aviso(falha.message, 'erro');
        botaoDaAcao.disabled = false;
      }
    });

    popup.addEventListener('close', () => {
      popup.remove();
      resolver(resultado);
    });

    document.body.appendChild(popup);
    popup.showModal();
  });
}
