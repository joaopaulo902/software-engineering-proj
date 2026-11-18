import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function ListaDeProjetos({ aoAbrirProjeto }) {
  const [filtros, setFiltros] = useState({ termo: '', areas: '', somenteVagas: false });
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativa = true;
    const temporizador = window.setTimeout(async () => {
      setCarregando(true);
      setErro('');
      try {
        const resultado = await api.projetos(filtros);
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
  }, [filtros]);

  function atualizar(chave, valor) {
    setFiltros((atuais) => ({ ...atuais, [chave]: valor }));
  }

  return (
    <>
      <form className="card filtros" onSubmit={(evento) => evento.preventDefault()}>
        <input
          type="search"
          value={filtros.termo}
          onChange={(evento) => atualizar('termo', evento.target.value)}
          placeholder="Buscar por projeto ou vaga…"
          aria-label="Buscar por projeto ou vaga"
        />
        <input
          type="text"
          value={filtros.areas}
          onChange={(evento) => atualizar('areas', evento.target.value)}
          placeholder="Áreas (ex: Robótica, Saúde)…"
          aria-label="Filtrar por áreas"
        />
        <label className="filtro-checkbox">
          <input
            type="checkbox"
            checked={filtros.somenteVagas}
            onChange={(evento) => atualizar('somenteVagas', evento.target.checked)}
          />
          Vagas abertas
        </label>
      </form>

      {carregando ? (
        <p className="carregando">A carregar projetos…</p>
      ) : erro ? (
        <p className="aviso aviso--erro">{erro}</p>
      ) : projetos.length === 0 ? (
        <p className="aviso aviso--info">Nenhum projeto encontrado com esses filtros.</p>
      ) : (
        <div className="lista">
          {projetos.map((projeto) => {
            const quantidadeVagas = Number(
              projeto.vagasAbertas ??
              (projeto.vagas ? projeto.vagas.filter((vaga) => vaga.aberta).length : 0)
            );
            const nome = projeto.nome || projeto.titulo || projeto.descricao || 'Projeto sem título';
            const coordenador = projeto.coordenadorNome ||
              (projeto.coordenadorId ? `ID: ${projeto.coordenadorId}` : 'Não atribuído');

            return (
              <article
                className="card card--hover"
                key={projeto.id}
                role="button"
                tabIndex={0}
                onClick={() => aoAbrirProjeto(projeto.id)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    aoAbrirProjeto(projeto.id);
                  }
                }}
              >
                <header className="card__topo">
                  <div>
                    <h3>{nome}</h3>
                    {projeto.area && <span className="etiqueta etiqueta--aceita">{projeto.area}</span>}
                    {projeto.descricao && <p className="card__projeto">{projeto.descricao}</p>}
                  </div>
                  <span className={`contador ${quantidadeVagas === 0 ? 'contador--zero' : ''}`}>
                    {quantidadeVagas} {quantidadeVagas === 1 ? 'vaga aberta' : 'vagas abertas'}
                  </span>
                </header>
                <div className="card__rodape">
                  <span>Coordenação: <strong>{coordenador}</strong></span>
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
