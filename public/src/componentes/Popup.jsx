// O popup dos prototipos: titulo, X para fechar, corpo e os botoes no rodape.
//
// Usa o <dialog> do navegador, que ja cuida de prender o foco dentro do popup
// e de fechar com Esc.

import { useEffect, useRef, useState } from 'react';
import { Aviso } from './Avisos';

/**
 * aberto           mostra ou esconde o popup
 * aoFechar         chamada no X, no Esc, no clique fora e no botao de saida
 * titulo           texto do topo
 * children         o miolo (texto fixo ou campos de formulario)
 *
 * Popup de confirmacao (remover, aprovar, declinar...):
 *   aoConfirmar      funcao async da acao. Se lancar erro, a mensagem aparece
 *                    dentro do popup e ele continua aberto, para o usuario
 *                    corrigir e tentar de novo. Se der certo, o popup fecha.
 *   rotuloConfirmar  texto do botao da acao; use o mesmo nome do botao que abriu o popup
 *   rotuloCancelar   texto do botao de saida (padrao: "Cancelar")
 *   perigo           true pinta o botao da acao de vermelho (remover, recusar, declinar)
 *
 * Popup com rodape proprio:
 *   rodape           botoes do rodape; sem `aoConfirmar` nem `rodape`, nao ha rodape
 */
export function Popup({
  aberto,
  aoFechar,
  titulo,
  children,
  rodape = null,
  aoConfirmar = null,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  perigo = false
}) {
  const dialogo = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setEnviando(false);
    if (!dialogo.current?.open) dialogo.current?.showModal();
  }, [aberto]);

  if (!aberto) return null;

  function fechar() {
    if (!enviando) aoFechar();
  }

  async function confirmar(evento) {
    evento.preventDefault();
    if (!aoConfirmar) return;
    setErro('');
    setEnviando(true);
    try {
      await aoConfirmar();
      setEnviando(false);
      aoFechar();
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  }

  const corpo = (
    <>
      <header className="popup__topo">
        <h2>{titulo}</h2>
        <button type="button" className="popup__fechar" onClick={fechar} aria-label="Fechar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <div className="popup__corpo">{children}</div>
    </>
  );

  return (
    <dialog
      ref={dialogo}
      className="popup"
      onCancel={(evento) => {
        evento.preventDefault();
        fechar();
      }}
      // Clique fora da caixa fecha, como nos prototipos.
      onClick={(evento) => {
        if (evento.target === dialogo.current) fechar();
      }}
    >
      {aoConfirmar ? (
        <form className="popup__caixa" onSubmit={confirmar} noValidate>
          {corpo}
          <div className="retorno" role="alert">{erro && <Aviso tipo="erro">{erro}</Aviso>}</div>
          <footer className="popup__acoes">
            <button type="button" className="botao" onClick={fechar} disabled={enviando}>
              {rotuloCancelar}
            </button>
            <button
              type="submit"
              className={`botao ${perigo ? 'botao--perigo' : 'botao--primario'}`}
              disabled={enviando}
            >
              {rotuloConfirmar}
            </button>
          </footer>
        </form>
      ) : (
        <div className="popup__caixa">
          {corpo}
          {rodape && <footer className="popup__acoes">{rodape}</footer>}
        </div>
      )}
    </dialog>
  );
}
