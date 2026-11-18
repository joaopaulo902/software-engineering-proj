export function MeusProjetos({ participacoes, aoAbrirProjeto }) {
  const ativos = participacoes.filter((participacao) => participacao.ativa !== false);
  const encerrados = participacoes.filter((participacao) => participacao.ativa === false);

  return (
    <>
      <h2>Meus Projetos & Participações</h2>
      <div className="lista">
        {ativos.length === 0 ? (
          <p className="aviso aviso--info">Sem projetos ou coordenações ativas no momento.</p>
        ) : ativos.map((participacao) => {
          const nome = participacao.projetoNome || participacao.projetoTitulo ||
            (participacao.projetoId ? `Projeto #${participacao.projetoId}` : 'Projeto');
          return (
            <article className="card" key={participacao.id}>
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
      {encerrados.length > 0 && (
        <details className="historico-participacoes">
          <summary>Histórico de Participações Encerradas ({encerrados.length})</summary>
          <div className="lista">
            {encerrados.map((participacao) => (
              <article className="card" key={participacao.id}>
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
  );
}
