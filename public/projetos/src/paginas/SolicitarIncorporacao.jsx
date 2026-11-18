import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function SolicitarIncorporacao({ aoVoltar, aoSolicitar }) {
  const [termo, setTermo] = useState('');
  const [projetos, setProjetos] = useState([]);
  const [pedidoAberto, setPedidoAberto] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativa = true;
    const temporizador = window.setTimeout(async () => {
      setCarregando(true);
      setErro('');
      try {
        const resultado = await api.projetosParaIncorporar(termo);
        if (ativa) setProjetos(Array.isArray(resultado) ? resultado : []);
      } catch (falha) {
        if (ativa) setErro(falha.message);
      } finally {
        if (ativa) setCarregando(false);
      }
    }, 250);
    return () => {
      ativa = false;
      window.clearTimeout(temporizador);
    };
  }, [termo]);

  async function enviarPedido(evento) {
    evento.preventDefault();
    if (!pedidoAberto) return;
    setEnviando(true);
    setErro('');
    setSucesso('');
    try {
      const projeto = projetos.find((item) => item.id === pedidoAberto);
      await api.solicitarIncorporacao(pedidoAberto, mensagem.trim() || null);
      await aoSolicitar?.();
      setProjetos((atuais) => atuais.filter((item) => item.id !== pedidoAberto));
      setPedidoAberto(null);
      setMensagem('');
      setSucesso(`Solicitação para “${projeto?.nome || 'o projeto'}” enviada para aprovação.`);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pagina-incorporacao">
      <button className="botao voltar" type="button" onClick={aoVoltar}>← Meus projetos</button>
      <div>
        <h2>Incorporar projeto</h2>
        <p className="discreto">
          Escolha um projeto da base institucional. A solicitação será analisada por um administrador.
        </p>
      </div>

      {sucesso && <p className="aviso aviso--sucesso" role="status">{sucesso}</p>}
      {erro && <p className="aviso aviso--erro" role="alert">{erro}</p>}

      <label className="campo-busca">
        <span>Buscar projeto</span>
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Nome, descrição ou área"
        />
      </label>

      {carregando ? (
        <p className="carregando">Carregando projetos disponíveis…</p>
      ) : projetos.length === 0 ? (
        <p className="aviso aviso--info">Nenhum projeto disponível para incorporação.</p>
      ) : (
        <div className="lista">
          {projetos.map((projeto) => (
            <article className="card" key={projeto.id}>
              <header className="card__topo">
                <div>
                  <h3>{projeto.nome}</h3>
                  <span className="etiqueta etiqueta--aceita">{projeto.area}</span>
                  {projeto.descricao && <p className="card__projeto">{projeto.descricao}</p>}
                </div>
                <span className="discreto">
                  Coordenação institucional: {projeto.coordenadorCadastrado || 'Não informada'}
                </span>
              </header>
              {pedidoAberto === projeto.id ? (
                <form className="formulario-incorporacao" onSubmit={enviarPedido}>
                  <label>
                    Mensagem para o administrador (opcional)
                    <textarea
                      value={mensagem}
                      onChange={(evento) => setMensagem(evento.target.value)}
                      maxLength={1000}
                      rows={3}
                    />
                  </label>
                  <div className="acoes-incorporacao">
                    <button className="botao botao--primario" type="submit" disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Enviar solicitação'}
                    </button>
                    <button className="botao" type="button" onClick={() => setPedidoAberto(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <footer className="card__rodape">
                  <span />
                  <button
                    className="botao botao--primario"
                    type="button"
                    onClick={() => {
                      setErro('');
                      setPedidoAberto(projeto.id);
                    }}
                  >
                    Solicitar incorporação
                  </button>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
