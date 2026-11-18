import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { navegar } from '../navegacao';
import { AbasDeProjetos } from '../componentes/AbasDeProjetos';

/** Uma chave unica por linha: o coordenador vem sem participacaoId. */
function chave(participacao) {
  return `${participacao.projetoId}-${participacao.participacaoId ?? participacao.id ?? 'coordenacao'}`;
}

/**
 * Meus Projetos: as participacoes do usuario, os projetos que ele coordena e,
 * para o coordenador, os pedidos de incorporacao ainda pendentes (C17).
 */
export function MeusProjetos({ usuario }) {
  const ehCoordenador = usuario?.papel === 'COORDENADOR';
  const [participacoes, setParticipacoes] = useState([]);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativa = true;
    Promise.all([
      api.meusProjetos(),
      ehCoordenador ? api.minhasIncorporacoesPendentes() : Promise.resolve([])
    ])
      .then(([lista, pedidos]) => {
        if (!ativa) return;
        setParticipacoes(Array.isArray(lista) ? lista : []);
        setPedidosPendentes(Array.isArray(pedidos) ? pedidos : []);
      })
      .catch((falha) => ativa && setErro(falha.message))
      .finally(() => ativa && setCarregando(false));
    return () => {
      ativa = false;
    };
  }, [ehCoordenador]);

  const aoAbrirProjeto = (id) => navegar(`/projetos/${id}`);
  const ativos = participacoes.filter((participacao) => participacao.ativa !== false);
  const encerrados = participacoes.filter((participacao) => participacao.ativa === false);

  return (
    <div className="pagina-projetos">
      <AbasDeProjetos atual="/meus-projetos" />
      {erro && <p className="aviso aviso--erro">{erro}</p>}

      <header className="detalhe-secao__topo">
        <h2>Meus Projetos & Participações</h2>
        {ehCoordenador && (
          <button className="botao botao--primario" type="button" onClick={() => navegar('/meus-projetos/incorporar')}>
            <span aria-hidden="true">+</span> Incorporar projeto
          </button>
        )}
      </header>

      {carregando ? (
        <p className="carregando">A carregar projetos…</p>
      ) : (
        <>
          <div className="lista">
            {ativos.length === 0 ? (
              <p className="aviso aviso--info">Sem projetos ou coordenações ativas no momento.</p>
            ) : ativos.map((participacao) => {
              const nome = participacao.projetoNome || participacao.projetoTitulo ||
                (participacao.projetoId ? `Projeto #${participacao.projetoId}` : 'Projeto');
              return (
                <article className="card" key={chave(participacao)}>
                  <div className="participacao-card">
                    <div>
                      <h3>{nome}</h3>
                      <div className="participacao-card__tags">
                        <span className="etiqueta">
                          {participacao.coordenador ? 'Coordenador(a)' : participacao.cargo || 'Participante'}
                        </span>
                        {participacao.projetoArea && <span className="etiqueta">{participacao.projetoArea}</span>}
                      </div>
                    </div>
                    <button
                      className="botao botao--primario"
                      type="button"
                      onClick={() => aoAbrirProjeto(participacao.projetoId)}
                    >
                      Ver projeto
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {ehCoordenador && pedidosPendentes.length > 0 && (
            <section className="pedidos-projeto">
              <h3>Solicitações de incorporação</h3>
              <div className="lista">
                {pedidosPendentes.map((item) => (
                  <article className="card" key={item.id}>
                    <div>
                      <h3>{item.projeto?.nome || `Projeto #${item.projetoId}`}</h3>
                      <div className="participacao-card__tags">
                        {item.projeto?.area && <span className="etiqueta">{item.projeto.area}</span>}
                        <span className="etiqueta etiqueta--cancelada">Não incorporado</span>
                        <span className="etiqueta etiqueta--em_analise">Aguardando aprovação</span>
                      </div>
                      <p className="discreto">
                        Solicitado em {new Date(item.solicitadoEm).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {encerrados.length > 0 && (
            <details className="historico-participacoes">
              <summary>Histórico de Participações Encerradas ({encerrados.length})</summary>
              <div className="lista">
                {encerrados.map((participacao) => (
                  <article className="card" key={chave(participacao)}>
                    <div className="participacao-card">
                      <div>
                        <h3>
                          {participacao.projetoNome || participacao.projetoTitulo ||
                            `Projeto #${participacao.projetoId}`}
                        </h3>
                        <span className="etiqueta etiqueta--cancelada">Encerrada</span>
                        {participacao.fim && (
                          <span className="discreto">
                            {' '}· Encerrada em {new Date(participacao.fim).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <button
                        className="botao"
                        type="button"
                        onClick={() => aoAbrirProjeto(participacao.projetoId)}
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
