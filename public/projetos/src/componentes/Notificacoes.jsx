import { useEffect, useRef, useState } from 'react';
import { api } from '../servicos-api';

export function Notificacoes({ aoAbrirProjeto }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [marcandoLidas, setMarcandoLidas] = useState(false);
  const raiz = useRef(null);

  async function carregar() {
    setErro('');
    try {
      const notificacoes = await api.notificacoes();
      setLista(Array.isArray(notificacoes) ? notificacoes : []);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    function fecharAoClicarFora(evento) {
      if (raiz.current && !raiz.current.contains(evento.target)) setAberto(false);
    }
    document.addEventListener('click', fecharAoClicarFora);
    return () => document.removeEventListener('click', fecharAoClicarFora);
  }, []);

  async function marcarLidas() {
    setMarcandoLidas(true);
    setErro('');
    try {
      await api.marcarNotificacoesLidas();
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setMarcandoLidas(false);
    }
  }

  function clicar(notificacao) {
    setAberto(false);
    if (notificacao.tipo === 'NOVA_ATIVIDADE' && notificacao.referenciaId) {
      aoAbrirProjeto(notificacao.referenciaId);
    }
  }

  const naoLidas = lista.filter((notificacao) => !notificacao.lida).length;

  return (
    <div className="notificacoes" ref={raiz}>
      <button
        className="botao notificacoes__botao"
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={aberto}
        aria-haspopup="true"
        title="Notificações"
      >
        <svg className="icone" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
          <path d="M10 21h4" />
        </svg>
        {naoLidas > 0 && <span className="sino__contador">{naoLidas > 99 ? '99+' : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="notificacoes__menu">
          <div className="notificacoes__topo">
            <strong>Notificações</strong>
            <button
              className="botao botao--texto"
              type="button"
              onClick={marcarLidas}
              disabled={marcandoLidas || naoLidas === 0}
            >
              Marcar lidas
            </button>
          </div>
          <div className="notificacoes__lista">
            {carregando ? (
              <p className="carregando">Carregando notificações…</p>
            ) : erro ? (
              <p className="aviso aviso--erro">{erro}</p>
            ) : lista.length === 0 ? (
              <p className="carregando">Sem notificações</p>
            ) : lista.map((notificacao) => (
              <button
                type="button"
                className={`notificacao ${notificacao.lida ? '' : 'notificacao--nao-lida'}`}
                key={notificacao.id}
                onClick={() => clicar(notificacao)}
              >
                <span className="etiqueta">{notificacao.tipo || 'Geral'}</span>
                <span>
                  {notificacao.texto || notificacao.mensagem || notificacao.conteudo ||
                    `Aviso do tipo: ${notificacao.tipo || 'Geral'} (Ref: #${notificacao.referenciaId})`}
                </span>
                {notificacao.criadaEm && (
                  <small>{new Date(notificacao.criadaEm).toLocaleString('pt-BR')}</small>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
