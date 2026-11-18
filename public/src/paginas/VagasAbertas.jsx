import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { CardDeVaga } from '../componentes/CardDeVaga';
import { MODALIDADES, ORDENACOES, TURNOS } from '../vagas';
import { navegar } from '../navegacao';

const FILTRO_INICIAL = {
  termo: '',
  areas: [],
  turnos: [],
  modalidades: [],
  cargaHorariaMaxima: '',
  ordenarPor: 'PRAZO'
};

/** Botoes de liga/desliga: escolher varios valores de uma lista. */
function Chaves({ rotulo, opcoes, escolhidas, aoMudar }) {
  function alternar(opcao) {
    aoMudar(escolhidas.includes(opcao) ? escolhidas.filter((o) => o !== opcao) : [...escolhidas, opcao]);
  }
  return (
    <div className="vagas-filtros__grupo" role="group" aria-label={rotulo}>
      <span className="vagas-filtros__rotulo">{rotulo}</span>
      {opcoes.map((opcao) => (
        <button
          key={opcao}
          type="button"
          className="chave"
          aria-pressed={escolhidas.includes(opcao)}
          onClick={() => alternar(opcao)}
        >
          {opcao}
        </button>
      ))}
    </div>
  );
}

/** C01 - Consultar e Filtrar Vagas de Extensao. */
export function VagasAbertas({ usuario }) {
  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [vagas, setVagas] = useState([]);
  const [areasConhecidas, setAreasConhecidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // As areas para filtrar sao as que existem nas vagas abertas.
  useEffect(() => {
    api.vagas()
      .then((todas) => {
        const areas = new Set(todas.flatMap((vaga) => vaga.areasTematicas ?? []));
        setAreasConhecidas([...areas].sort((a, b) => a.localeCompare(b, 'pt-BR')));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ativa = true;
    const temporizador = window.setTimeout(async () => {
      setCarregando(true);
      setErro('');
      try {
        const resultado = await api.vagas(filtro);
        if (ativa) setVagas(resultado);
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
  }, [filtro]);

  function atualizar(chave, valor) {
    setFiltro((atual) => ({ ...atual, [chave]: valor }));
  }

  const temFiltro =
    filtro.termo || filtro.areas.length || filtro.turnos.length ||
    filtro.modalidades.length || filtro.cargaHorariaMaxima;

  return (
    <div className="pagina-projetos">
      <div className="detalhe-secao__topo">
        <div>
          <h2 className="vagas-titulo">Vagas abertas</h2>
          <span>Vagas com inscrições abertas e posições livres.</span>
        </div>
        {usuario?.papel === 'COORDENADOR' && (
          <button type="button" className="botao botao--primario" onClick={() => navegar('/vagas/nova')}>
            + Ofertar nova vaga
          </button>
        )}
      </div>

      <form className="card vagas-filtros" role="search" onSubmit={(evento) => evento.preventDefault()}>
        <div className="vagas-filtros__linha">
          <input
            type="search"
            value={filtro.termo}
            onChange={(evento) => atualizar('termo', evento.target.value)}
            placeholder="Buscar por vaga, projeto, responsável ou área…"
            aria-label="Buscar vagas"
          />
          <select
            value={filtro.ordenarPor}
            onChange={(evento) => atualizar('ordenarPor', evento.target.value)}
            aria-label="Ordenar por"
          >
            {ORDENACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </div>

        {areasConhecidas.length > 0 && (
          <Chaves rotulo="Áreas" opcoes={areasConhecidas} escolhidas={filtro.areas}
                  aoMudar={(valor) => atualizar('areas', valor)} />
        )}
        <Chaves rotulo="Turno" opcoes={TURNOS} escolhidas={filtro.turnos}
                aoMudar={(valor) => atualizar('turnos', valor)} />
        <Chaves rotulo="Modalidade" opcoes={MODALIDADES} escolhidas={filtro.modalidades}
                aoMudar={(valor) => atualizar('modalidades', valor)} />

        <div className="vagas-filtros__grupo">
          <label className="vagas-filtros__rotulo" htmlFor="cargaMaxima">Até</label>
          <input
            id="cargaMaxima"
            type="number"
            min="1"
            max="40"
            className="vagas-filtros__carga"
            value={filtro.cargaHorariaMaxima}
            onChange={(evento) => atualizar('cargaHorariaMaxima', evento.target.value)}
            placeholder="40"
          />
          <span className="vagas-filtros__rotulo">horas por semana</span>
          {temFiltro ? (
            <button type="button" className="botao botao--texto" onClick={() => setFiltro(FILTRO_INICIAL)}>
              Limpar filtros
            </button>
          ) : null}
        </div>
      </form>

      {carregando ? (
        <p className="carregando">Carregando vagas…</p>
      ) : erro ? (
        <p className="aviso aviso--erro">{erro}</p>
      ) : vagas.length === 0 ? (
        <p className="aviso aviso--info">
          {temFiltro ? 'Nenhuma vaga com esses filtros.' : 'Nenhuma vaga aberta no momento.'}
        </p>
      ) : (
        <>
          <p className="resumo">{vagas.length} {vagas.length === 1 ? 'vaga' : 'vagas'}</p>
          <div className="lista">
            {vagas.map((vaga) => (
              <CardDeVaga key={vaga.id} vaga={vaga} aoAbrir={(id) => navegar(`/vagas/${id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
