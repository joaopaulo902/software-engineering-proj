import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function AvaliarIncorporacoes() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

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

  async function avaliar(pedido, decisao) {
    const acao = decisao === 'DEFERIDO' ? 'aprovar' : 'indeferir';
    const projeto = pedido.projeto?.nome || 'este projeto';
    if (!window.confirm(`Deseja ${acao} a incorporação de “${projeto}”?`)) return;

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

  return (
    <section className="pagina-incorporacao">
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
                  onClick={() => avaliar(pedido, 'DEFERIDO')}
                >
                  {processando === pedido.id ? 'Processando…' : 'Aprovar'}
                </button>
                <button
                  className="botao botao--perigo"
                  type="button"
                  disabled={processando !== null}
                  onClick={() => avaliar(pedido, 'INDEFERIDO')}
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
