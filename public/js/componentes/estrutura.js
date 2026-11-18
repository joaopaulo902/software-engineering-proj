// Pacote `componentes` do subsistema Cliente Web.
// A estrutura comum das telas: menu lateral, cabecalho com sino e perfil, e a
// area onde cada tela desenha. Todas as telas depois da entrada vivem aqui.

import { escapar, iniciais } from './base.js';

const ROTULO_PAPEL = {
  ESTUDANTE: 'Estudante',
  COORDENADOR: 'Coordenação',
  ADMIN: 'Administração'
};

const svg = (miolo) =>
  `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${miolo}</svg>`;

/** Icones do menu. Para um item novo, acrescente o desenho aqui e use o nome em MENU. */
export const ICONES = {
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  vagas: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'),
  candidaturas: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>'),
  projetos: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  sino: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>'),
  equipe: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M16.5 15.2A5 5 0 0 1 21 20"/>'),
  mais: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>'),
  banlist: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
  base: svg('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
  perfil: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  sair: svg('<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 16l4-4-4-4M20 12H9"/>')
};

const CHAVE_MENU = 'connext.menuRecolhido';

function menuComecaRecolhido() {
  try {
    return localStorage.getItem(CHAVE_MENU) === '1';
  } catch {
    return false;
  }
}

function lembrarMenu(recolhido) {
  try {
    localStorage.setItem(CHAVE_MENU, recolhido ? '1' : '0');
  } catch {
    // Navegador sem armazenamento: o menu so nao lembra a escolha.
  }
}

// A estrutura montada no momento. So existe uma por vez.
let raiz = null;
let mensagem = { viva: false, atravessaUmaTela: false };

/**
 * Desenha a estrutura dentro de `app`.
 *
 * usuario  quem esta logado
 * itens    as entradas do menu lateral deste papel (MENU[papel] de rotas.js)
 * aoSair   chamada quando o usuario clica em Sair
 */
export function montarEstrutura(app, { usuario, itens, aoSair }) {
  app.innerHTML = `
    <div class="estrutura ${menuComecaRecolhido() ? 'estrutura--recolhida' : ''}">
      <button type="button" class="pular" data-pular>Ir para o conteúdo</button>

      <aside class="menu" id="menu" aria-label="Menu principal">
        <div class="menu__topo">
          <button type="button" class="menu__botao" data-recolher
                  aria-label="Recolher ou expandir o menu">${ICONES.menu}</button>
          <span class="menu__marca">Connext</span>
        </div>

        <nav class="menu__itens">
          ${itens
            .map(
              (item) => `
                <a class="menu__item" href="#${item.caminho}" data-menu="${item.caminho}"
                   title="${escapar(item.rotulo)}">
                  ${ICONES[item.icone] ?? ''}
                  <span class="menu__rotulo">${escapar(item.rotulo)}</span>
                </a>`
            )
            .join('')}
        </nav>

        <div class="menu__pe">
          <a class="menu__item" href="#/perfil" data-menu="/perfil" title="Perfil">
            ${ICONES.perfil}
            <span class="menu__rotulo">Perfil</span>
          </a>
          <button type="button" class="menu__item" data-sair title="Sair">
            ${ICONES.sair}
            <span class="menu__rotulo">Sair</span>
          </button>
        </div>
      </aside>

      <div class="menu__fundo" data-fechar-menu></div>

      <div class="palco">
        <header class="cabecalho">
          <button type="button" class="cabecalho__menu" data-abrir-menu
                  aria-label="Abrir o menu" aria-controls="menu">${ICONES.menu}</button>
          <h1 class="cabecalho__titulo" data-titulo></h1>

          <div class="cabecalho__lado">
            <a class="cabecalho__icone" href="#/notificacoes" data-sino aria-label="Notificações">
              ${ICONES.sino}
              <span class="sino__contador" data-contador hidden></span>
            </a>
            <a class="cabecalho__perfil" href="#/perfil" title="Perfil">
              <span class="avatar" aria-hidden="true">${escapar(iniciais(usuario.nome))}</span>
              <span class="cabecalho__quem">
                <strong>${escapar(usuario.nome)}</strong>
                <span>${escapar(ROTULO_PAPEL[usuario.papel] ?? usuario.papel)}${
                  usuario.semestre ? `, ${usuario.semestre}º semestre` : ''
                }</span>
              </span>
            </a>
          </div>
        </header>

        <p class="faixa-exemplo" data-exemplo hidden>
          <strong>Dados de exemplo.</strong>
          O servidor ainda não tem as rotas de candidatura da Etapa 3, então estas telas
          usam dados guardados nesta aba do navegador. O que você fizer aqui não chega ao banco.
        </p>

        <div class="mensagem-rapida" data-mensagem role="status" aria-live="polite"></div>

        <main class="conteudo" id="conteudo" tabindex="-1"></main>
      </div>
    </div>`;

  raiz = app.querySelector('.estrutura');
  mensagem = { viva: false, atravessaUmaTela: false };

  raiz.querySelector('[data-recolher]').addEventListener('click', () => {
    // No celular o mesmo botao fecha a gaveta; no computador, recolhe para so icones.
    if (raiz.classList.contains('estrutura--menu-aberto')) {
      raiz.classList.remove('estrutura--menu-aberto');
      return;
    }
    lembrarMenu(raiz.classList.toggle('estrutura--recolhida'));
  });

  raiz.querySelector('[data-abrir-menu]').addEventListener('click', () => {
    raiz.classList.add('estrutura--menu-aberto');
  });
  raiz.querySelector('[data-fechar-menu]').addEventListener('click', () => {
    raiz.classList.remove('estrutura--menu-aberto');
  });

  raiz.querySelector('[data-sair]').addEventListener('click', aoSair);

  // Atalho de teclado para quem navega com Tab: pula o menu.
  raiz.querySelector('[data-pular]').addEventListener('click', () => {
    raiz.querySelector('.conteudo').focus();
  });

  if (exemploEmUso) raiz.querySelector('[data-exemplo]').hidden = false;
}

/**
 * Prepara a estrutura para a proxima tela: titulo, item marcado no menu e uma
 * area de conteudo NOVA. Devolve essa area.
 *
 * A area e trocada (e nao so esvaziada) para que uma tela lenta, que termina
 * de carregar depois de o usuario ja ter ido para outra, desenhe num elemento
 * que nao esta mais na pagina em vez de atropelar a tela atual.
 */
export function prepararTela({ titulo, itemDoMenu }) {
  definirTitulo(titulo);

  raiz.querySelectorAll('[data-menu]').forEach((item) => {
    if (item.dataset.menu === itemDoMenu) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  raiz.classList.remove('estrutura--menu-aberto');

  // A mensagem rapida some na troca de tela, a nao ser que tenha sido criada
  // justamente para aparecer na tela seguinte ("Candidatura removida.").
  if (mensagem.viva && mensagem.atravessaUmaTela) {
    mensagem.atravessaUmaTela = false;
  } else {
    limparMensagem();
  }

  const antigo = raiz.querySelector('.conteudo');
  const novo = antigo.cloneNode(false);
  antigo.replaceWith(novo);
  return novo;
}

/** Troca o titulo do cabecalho (uma tela de detalhe pode por o nome do item). */
export function definirTitulo(titulo) {
  if (!raiz) return;
  raiz.querySelector('[data-titulo]').textContent = titulo;
  document.title = `${titulo} — Connext`;
}

/**
 * Mostra um retorno curto no topo da tela: "Ingresso confirmado.".
 * Pode ser chamada logo antes de `navegar(...)` ou de `recarregar()`: a
 * mensagem aparece na tela que vier em seguida e some na troca seguinte.
 */
export function mensagemRapida(texto, tipo = 'sucesso') {
  if (!raiz) return;
  const area = raiz.querySelector('[data-mensagem]');
  area.innerHTML = `<p class="aviso aviso--${tipo}">${escapar(texto)}</p>`;
  mensagem = { viva: true, atravessaUmaTela: true };
}

function limparMensagem() {
  raiz.querySelector('[data-mensagem]').innerHTML = '';
  mensagem = { viva: false, atravessaUmaTela: false };
}

/**
 * Numero no sino do cabecalho; 0 esconde o contador.
 * O principal.js ja chama a cada troca de tela, com GET /api/notificacoes.
 * A tela de Notificacoes (dupla B) chama com 0 depois de marcar como lidas,
 * para o numero sumir sem esperar a proxima troca de tela.
 */
export function definirContadorDoSino(quantidade) {
  if (!raiz) return;
  const contador = raiz.querySelector('[data-contador]');
  const sino = raiz.querySelector('[data-sino]');
  const n = Number(quantidade) || 0;

  contador.hidden = n <= 0;
  contador.textContent = n > 99 ? '99+' : String(n);
  sino.setAttribute(
    'aria-label',
    n > 0 ? `Notificações: ${n} não ${n === 1 ? 'lida' : 'lidas'}` : 'Notificações'
  );
}

// O pacote servicos-api avisa por este evento quando respondeu com dados de
// exemplo. Ele nao conhece a tela; quem decide como mostrar e a estrutura.
let exemploEmUso = false;
window.addEventListener('connext:dados-de-exemplo', () => {
  exemploEmUso = true;
  const faixa = raiz?.querySelector('[data-exemplo]');
  if (faixa) faixa.hidden = false;
});
