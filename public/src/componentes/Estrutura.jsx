// A estrutura comum das telas: menu lateral, cabecalho com sino e perfil, e a
// area onde cada tela desenha. Todas as telas depois da entrada vivem aqui.

import { useEffect, useRef, useState } from 'react';
import { api } from '../servicos-api';
import { iniciais } from '../formatos';
import { useExemploEmUso } from '../contexto';
import { Icone } from './Icones';
import { Aviso, Carregando } from './Avisos';
import { ItemDeNotificacao, abrirNotificacao } from './Notificacao';

const ROTULO_PAPEL = {
  ESTUDANTE: 'Estudante',
  COORDENADOR: 'Coordenação',
  ADMIN: 'Administração'
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

/**
 * usuario         quem esta logado
 * itens           as entradas do menu lateral deste papel (MENU[papel] de rotas.js)
 * itemDoMenu      caminho do item marcado no menu
 * titulo          titulo do cabecalho
 * mensagem        { texto, tipo } da mensagem rapida, ou null
 * naoLidas        numero do sino
 * aoMudarNaoLidas atualiza o numero do sino depois de carregar o dropdown
 * aoSair          chamada quando o usuario clica em Sair
 * versao          muda a cada troca de tela (fecha o menu do celular)
 * children        a tela atual
 */
export function Estrutura({
  usuario,
  itens,
  itemDoMenu,
  titulo,
  mensagem,
  naoLidas,
  aoMudarNaoLidas,
  aoSair,
  versao,
  children
}) {
  const [recolhido, setRecolhido] = useState(menuComecaRecolhido);
  const [menuAberto, setMenuAberto] = useState(false);
  const conteudo = useRef(null);
  const exemploEmUso = useExemploEmUso();

  // No celular, a gaveta do menu fecha a cada troca de tela.
  useEffect(() => setMenuAberto(false), [versao]);

  function alternarMenu() {
    // No celular o mesmo botao fecha a gaveta; no computador, recolhe para so icones.
    if (menuAberto) {
      setMenuAberto(false);
      return;
    }
    setRecolhido((atual) => {
      lembrarMenu(!atual);
      return !atual;
    });
  }

  const classes = ['estrutura'];
  if (recolhido) classes.push('estrutura--recolhida');
  if (menuAberto) classes.push('estrutura--menu-aberto');

  const marcado = (caminho) => (caminho === itemDoMenu ? 'page' : undefined);

  return (
    <div className={classes.join(' ')}>
      {/* Atalho de teclado para quem navega com Tab: pula o menu. */}
      <button type="button" className="pular" onClick={() => conteudo.current?.focus()}>
        Ir para o conteúdo
      </button>

      <aside className="menu" id="menu" aria-label="Menu principal">
        <div className="menu__topo">
          <button type="button" className="menu__botao" onClick={alternarMenu}
                  aria-label="Recolher ou expandir o menu">
            <Icone nome="menu" />
          </button>
          <span className="menu__marca">Connext<small>Extensão · INF</small></span>
        </div>

        <nav className="menu__itens">
          {itens.map((item) => (
            <a className="menu__item" href={`#${item.caminho}`} key={item.caminho}
               title={item.rotulo} aria-current={marcado(item.caminho)}>
              <Icone nome={item.icone} />
              <span className="menu__rotulo">{item.rotulo}</span>
            </a>
          ))}
        </nav>

        <div className="menu__pe">
          <a className="menu__item" href="#/perfil" title="Perfil" aria-current={marcado('/perfil')}>
            <Icone nome="perfil" />
            <span className="menu__rotulo">Perfil</span>
          </a>
          <button type="button" className="menu__item" title="Sair" onClick={aoSair}>
            <Icone nome="sair" />
            <span className="menu__rotulo">Sair</span>
          </button>
        </div>
      </aside>

      <div className="menu__fundo" onClick={() => setMenuAberto(false)} />

      <div className="palco">
        <p className="faixa-institucional">Universidade Federal do Rio Grande do Sul · Instituto de Informática</p>
        <header className="cabecalho">
          <button type="button" className="cabecalho__menu" onClick={() => setMenuAberto(true)}
                  aria-label="Abrir o menu" aria-controls="menu">
            <Icone nome="menu" />
          </button>
          <h1 className="cabecalho__titulo">{titulo}</h1>

          <div className="cabecalho__lado">
            <Sino naoLidas={naoLidas} aoMudarNaoLidas={aoMudarNaoLidas} />
            <a className="cabecalho__perfil" href="#/perfil" title="Perfil">
              <span className="avatar" aria-hidden="true">{iniciais(usuario.nome)}</span>
              <span className="cabecalho__quem">
                <strong>{usuario.nome}</strong>
                <span>
                  {ROTULO_PAPEL[usuario.papel] ?? usuario.papel}
                  {usuario.semestre ? `, ${usuario.semestre}º semestre` : ''}
                </span>
              </span>
            </a>
          </div>
        </header>

        {exemploEmUso && (
          <p className="faixa-exemplo">
            <strong>Dados de exemplo.</strong>{' '}
            O servidor ainda não tem as rotas de candidatura da Etapa 3, então estas telas
            usam dados guardados nesta aba do navegador. O que você fizer aqui não chega ao banco.
          </p>
        )}

        <div className="mensagem-rapida" role="status" aria-live="polite">
          {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
        </div>

        <main className="conteudo" id="conteudo" tabIndex={-1} ref={conteudo}>
          {children}
        </main>
      </div>
    </div>
  );
}

/** O sino do cabecalho, com o contador e o dropdown das notificacoes. */
function Sino({ naoLidas, aoMudarNaoLidas }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState({ carregando: false, itens: null, erro: '' });
  const [marcando, setMarcando] = useState(false);
  const area = useRef(null);

  // Clique fora do sino fecha o dropdown.
  useEffect(() => {
    if (!aberto) return undefined;
    function fecharSeFora(evento) {
      if (area.current && !area.current.contains(evento.target)) setAberto(false);
    }
    document.addEventListener('click', fecharSeFora);
    return () => document.removeEventListener('click', fecharSeFora);
  }, [aberto]);

  async function carregar() {
    setLista({ carregando: true, itens: null, erro: '' });
    try {
      const notificacoes = await api.notificacoes();
      setLista({ carregando: false, itens: notificacoes, erro: '' });
      aoMudarNaoLidas(notificacoes.filter((notificacao) => !notificacao.lida).length);
    } catch (erro) {
      setLista({
        carregando: false,
        itens: null,
        erro: erro.message || 'Não foi possível carregar notificações.'
      });
    }
  }

  function alternar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir) carregar();
  }

  async function marcarLidas() {
    setMarcando(true);
    try {
      await api.marcarNotificacoesLidas();
      aoMudarNaoLidas(0);
      await carregar();
    } catch (erro) {
      setLista({
        carregando: false,
        itens: null,
        erro: erro.message || 'Não foi possível marcar as notificações como lidas.'
      });
    } finally {
      setMarcando(false);
    }
  }

  function abrir(notificacao) {
    setAberto(false);
    abrirNotificacao(notificacao);
  }

  const n = Number(naoLidas) || 0;

  return (
    <div className="cabecalho__notificacoes" ref={area}>
      <button
        type="button"
        className="cabecalho__icone"
        aria-label={n > 0 ? `Notificações: ${n} não ${n === 1 ? 'lida' : 'lidas'}` : 'Notificações'}
        aria-controls="menuNotificacoes"
        aria-expanded={aberto}
        title="Notificações"
        onClick={alternar}
      >
        <Icone nome="sino" />
        {n > 0 && <span className="sino__contador">{n > 99 ? '99+' : String(n)}</span>}
      </button>

      {aberto && (
        <section className="cabecalho__notificacoes-menu" id="menuNotificacoes" aria-label="Notificações">
          <header className="cabecalho__notificacoes-topo">
            <strong>Notificações</strong>
            <button type="button" className="botao botao--texto" onClick={marcarLidas} disabled={marcando}>
              Marcar lidas
            </button>
          </header>
          <div className="cabecalho__notificacoes-lista" aria-live="polite">
            {lista.carregando ? (
              <Carregando>Carregando notificações…</Carregando>
            ) : lista.erro ? (
              <Aviso tipo="erro">{lista.erro}</Aviso>
            ) : lista.itens?.length ? (
              lista.itens.map((notificacao) => (
                <ItemDeNotificacao key={notificacao.id} notificacao={notificacao} aoAbrir={abrir} />
              ))
            ) : (
              <Carregando>Sem notificações</Carregando>
            )}
          </div>
          <footer className="cabecalho__notificacoes-rodape">
            <a className="botao botao--texto" href="#/notificacoes" onClick={() => setAberto(false)}>
              Ver todas as notificações
            </a>
          </footer>
        </section>
      )}
    </div>
  );
}
