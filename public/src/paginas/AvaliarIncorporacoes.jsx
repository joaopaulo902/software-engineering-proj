import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { Popup } from '../componentes/Popup';

/** C17 - o administrador defere ou indefere os pedidos de incorporacao. */
export function AvaliarIncorporacoes() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  // { pedido, decisao } aguardando a confirmacao no popup
  const [aConfirmar, setAConfirmar] = useState(null);

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const resultado = await api.incorporacoesPendentes();
      setPedidos(Array.isArray(resultado) ? resultado : []);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // Chamada depois que o administrador confirma no popup.
  async function avaliar(pedido, decisao) {
    const projeto = pedido.projeto?.nome || 'este projeto';
    setProcessando(pedido.id);
    setErro('');
    setSucesso('');
    try {
      await api.avaliarIncorporacao(pedido.id, decisao);
      setSucesso(`Solicitação para “${projeto}” ${decisao === 'DEFERIDO' ? 'aprovada' : 'indeferida'}.`);
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setProcessando(null);
    }
  }

  const projetoAConfirmar = aConfirmar?.pedido.projeto?.nome || 'este projeto';
  const deferir = aConfirmar?.decisao === 'DEFERIDO';

  return (
    <section className="pagina-projetos pagina-incorporacao">
      <Popup
        aberto={Boolean(aConfirmar)}
        aoFechar={() => setAConfirmar(null)}
        titulo={deferir ? 'Aprovar incorporação' : 'Indeferir incorporação'}
        rotuloConfirmar={deferir ? 'Aprovar' : 'Indeferir'}
        perigo={!deferir}
        aoConfirmar={() => {
          const { pedido, decisao } = aConfirmar;
          setAConfirmar(null);
          avaliar(pedido, decisao);
        }}
      >
        <p>Deseja {deferir ? 'aprovar' : 'indeferir'} a incorporação de “{projetoAConfirmar}”?</p>
      </Popup>

      <div>
        <h2>Solicitações de incorporação</h2>
        <p className="discreto">Analise os pedidos enviados pelos coordenadores.</p>
      </div>

      {sucesso && <p className="aviso aviso--sucesso" role="status">{sucesso}</p>}
      {erro && <p className="aviso aviso--erro" role="alert">{erro}</p>}

      {carregando ? (
        <p className="carregando">Carregando solicitações…</p>
      ) : pedidos.length === 0 ? (
        <p className="aviso aviso--info">Não há solicitações pendentes.</p>
      ) : (
        <div className="lista">
          {pedidos.map((pedido) => (
            <article className="card" key={pedido.id}>
              <header className="card__topo">
                <div>
                  <h3>{pedido.projeto?.nome}</h3>
                  <span className="etiqueta etiqueta--aceita">{pedido.projeto?.area}</span>
                  <p className="card__projeto">{pedido.projeto?.descricao}</p>
                </div>
              </header>
              <p><strong>Coordenador solicitante:</strong> {pedido.coordenadorNome}</p>
              <p><strong>Coordenação institucional:</strong> {pedido.projeto?.coordenadorCadastrado || 'Não informada'}</p>
              {pedido.mensagem && <p><strong>Mensagem:</strong> {pedido.mensagem}</p>}
              <p className="discreto">
                Solicitado em {new Date(pedido.solicitadoEm).toLocaleString('pt-BR')}
              </p>
              <footer className="acoes-incorporacao">
                <button
                  className="botao botao--primario"
                  type="button"
                  disabled={processando !== null}
                  onClick={() => setAConfirmar({ pedido, decisao: 'DEFERIDO' })}
                >
                  {processando === pedido.id ? 'Processando…' : 'Aprovar'}
                </button>
                <button
                  className="botao botao--perigo"
                  type="button"
                  disabled={processando !== null}
                  onClick={() => setAConfirmar({ pedido, decisao: 'INDEFERIDO' })}
                >
                  Indeferir
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
