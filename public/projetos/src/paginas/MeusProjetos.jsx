export function MeusProjetos({ participacoes, aoAbrirProjeto }) {
  const ativos = participacoes.filter((item) => item.ativa !== false);
  const encerrados = participacoes.filter((item) => item.ativa === false);

  return (
    <>
      <h2>Meus Projetos & Participações</h2>
      <div className="lista">
        {ativos.length === 0 ? (
          <p className="aviso aviso--info">Sem projetos ou coordenações ativas no momento.</p>
        ) : ativos.map((item) => {
          const nome = item.projetoNome || item.projetoTitulo || `Projeto #${item.projetoId}`;
          return (
            <article className="card" key={`${item.projetoId}-${item.id || ''}`}>
              <div className="participacao-card">
                <div>
                  <h3>{nome}</h3>
                  <div className="participacao-card__tags">
                    <span className="etiqueta">{item.coordenador ? 'Coordenador(a)' : item.cargo || 'Participante'}</span>
                    {item.projetoArea && <span className="etiqueta">{item.projetoArea}</span>}
                  </div>
                </div>
                <button className="botao botao--primario" type="button" onClick={() => aoAbrirProjeto(item.projetoId)}>Ver projeto</button>
              </div>
            </article>
          );
        })}
      </div>
      {encerrados.length > 0 && (
        <details className="historico-participacoes">
          <summary>Histórico de Participações Encerradas ({encerrados.length})</summary>
          <div className="lista">
            {encerrados.map((item) => (
              <article className="card" key={`${item.projetoId}-${item.id || ''}`}>
                <div className="participacao-card">
                  <div>
                    <h3>{item.projetoNome || item.projetoTitulo || `Projeto #${item.projetoId}`}</h3>
                    <span className="etiqueta etiqueta--cancelada">Encerrada</span>
                  </div>
                  <button className="botao" type="button" onClick={() => aoAbrirProjeto(item.projetoId)}>Ver detalhes</button>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
