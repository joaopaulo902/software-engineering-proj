import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function ListaDeProjetos({ aoAbrirProjeto }) {
  const [filtros, setFiltros] = useState({ termo: '', areas: '', somenteVagas: false });
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar(valores = filtros) {
    setCarregando(true);
    try {
      setProjetos(await api.projetos(valores));
    } catch (erro) {
      setProjetos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function atualizar(chave, valor) {
    const novos = { ...filtros, [chave]: valor };
    setFiltros(novos);
    if (chave !== 'termo') carregar(novos);
  }

  return (
    <>
      <div className="card filtros">
        <input type="search" value={filtros.termo} onChange={(event) => atualizar('termo', event.target.value)} onKeyUp={() => carregar()} placeholder="Buscar por projeto ou vaga…" />
        <input type="text" value={filtros.areas} onChange={(event) => atualizar('areas', event.target.value)} placeholder="Áreas (ex: Robótica, Saúde)…" />
        <label className="filtro-checkbox">
          <input type="checkbox" checked={filtros.somenteVagas} onChange={(event) => atualizar('somenteVagas', event.target.checked)} />
          Vagas abertas
        </label>
      </div>
      {carregando ? (
        <p className="carregando">A carregar projetos…</p>
      ) : (
        <div className="lista">
          {projetos.length === 0 ? (
            <p className="aviso aviso--info">Nenhum projeto encontrado com esses filtros.</p>
          ) : projetos.map((projeto) => {
            const vagas = Number(projeto.vagasAbertas ?? 0);
            return (
              <article className="card card--hover" key={projeto.id} onClick={() => aoAbrirProjeto(projeto.id)}>
                <header className="card__topo">
                  <div>
                    <h3>{projeto.nome || projeto.titulo || projeto.descricao || 'Projeto sem título'}</h3>
                    {projeto.area && <span className="etiqueta etiqueta--aceita">{projeto.area}</span>}
                    {projeto.descricao && <p className="card__projeto">{projeto.descricao}</p>}
                  </div>
                  <span className={`contador ${vagas === 0 ? 'contador--zero' : ''}`}>
                    {vagas} {vagas === 1 ? 'vaga aberta' : 'vagas abertas'}
                  </span>
                </header>
                <div className="card__rodape">
                  <span>Coordenação: <strong>{projeto.coordenadorNome || 'Não atribuído'}</strong></span>
                  <span className="link">Ver projeto →</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
