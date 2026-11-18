import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function Notificacoes({ aoAbrirProjeto }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState([]);

  async function carregar() {
    try {
      setLista(await api.notificacoes());
    } catch {
      setLista([]);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function marcarLidas(event) {
    event.preventDefault();
    await api.marcarNotificacoesLidas();
    await carregar();
  }

  const naoLidas = lista.filter((item) => !item.lida).length;

  function clicar(item) {
    setAberto(false);
    if (item.tipo === 'NOVA_ATIVIDADE' && item.referenciaId) {
      aoAbrirProjeto(item.referenciaId);
    }
  }

  return (
    <div className="notificacoes">
      <button
        className="botao notificacoes__botao"
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label="Notificações"
        title="Notificações"
        aria-expanded={aberto}
      >
        <svg className="icone" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
          <path d="M10 21h4" />
        </svg>
        {naoLidas > 0 && <span className="sino__contador">{naoLidas}</span>}
      </button>
      {aberto && (
        <div className="notificacoes__menu">
          <div className="notificacoes__topo">
            <strong>Notificações</strong>
            <button className="botao botao--texto" type="button" onClick={marcarLidas}>Marcar lidas</button>
          </div>
          <div className="notificacoes__lista">
            {lista.length === 0 ? (
              <p className="carregando">Sem notificações</p>
            ) : lista.map((item) => (
              <button type="button" className={`notificacao ${item.lida ? '' : 'notificacao--nao-lida'}`} key={item.id} onClick={() => clicar(item)}>
                <span className="etiqueta">{item.tipo || 'Geral'}</span>
                <span>{item.texto || item.mensagem || item.conteudo || `Aviso (Ref: #${item.referenciaId})`}</span>
                {item.criadaEm && <small>{new Date(item.criadaEm).toLocaleString('pt-BR')}</small>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
