// Tela Notificacoes: o historico completo dos avisos do usuario.

import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { useAplicacao } from '../contexto';
import { Aviso, Carregando } from '../componentes/Avisos';
import { ItemDeNotificacao, abrirNotificacao } from '../componentes/Notificacao';

export function Notificacoes() {
  const { definirContadorDoSino } = useAplicacao();
  const [lista, setLista] = useState({ carregando: true, itens: null, erro: '' });
  const [marcando, setMarcando] = useState(false);

  async function carregar() {
    setLista({ carregando: true, itens: null, erro: '' });
    try {
      const notificacoes = await api.notificacoes();
      setLista({ carregando: false, itens: notificacoes, erro: '' });
      definirContadorDoSino(notificacoes.filter((notificacao) => !notificacao.lida).length);
    } catch (erro) {
      setLista({
        carregando: false,
        itens: null,
        erro: erro.message || 'Não foi possível carregar notificações.'
      });
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marcarLidas() {
    setMarcando(true);
    try {
      await api.marcarNotificacoesLidas();
      definirContadorDoSino(0);
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

  return (
    <section className="card pagina-notificacoes" aria-label="Todas as notificações">
      <header className="pagina-notificacoes__topo">
        <h2>Histórico completo</h2>
        <button type="button" className="botao botao--texto" onClick={marcarLidas} disabled={marcando}>
          Marcar todas como lidas
        </button>
      </header>
      <div className="pagina-notificacoes__lista" aria-live="polite">
        {lista.carregando ? (
          <Carregando>Carregando notificações…</Carregando>
        ) : lista.erro ? (
          <Aviso tipo="erro">{lista.erro}</Aviso>
        ) : lista.itens.length ? (
          lista.itens.map((notificacao) => (
            <ItemDeNotificacao key={notificacao.id} notificacao={notificacao} aoAbrir={abrirNotificacao} />
          ))
        ) : (
          <Aviso tipo="info">Você ainda não recebeu notificações.</Aviso>
        )}
      </div>
    </section>
  );
}
