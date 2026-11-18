import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { navegar } from '../navegacao';
import { dataBr as dataBrasileira } from '../formatos';
import { Popup } from '../componentes/Popup';

/** C02 - Visualizar Detalhes do Projeto: vagas, equipe e atividades (C10). */
export function DetalhesDoProjeto({ params, usuario }) {
  const projetoId = Number(params.id);
  const usuarioId = usuario?.id;
  const aoVoltar = () => navegar('/projetos');

  const [projeto, setProjeto] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  // Projetos em que o usuario participa: decidem se ele pode postar atividade.
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalAtividade, setModalAtividade] = useState(false);
  const [participacaoEditada, setParticipacaoEditada] = useState(null);
  const [participanteARemover, setParticipanteARemover] = useState(null);
  const [atividade, setAtividade] = useState({ titulo: '', descricao: '', foto: '' });
  const [cargo, setCargo] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const [dadosProjeto, dadosParticipantes, minhasParticipacoes] = await Promise.all([
        api.projeto(projetoId),
        api.participantes(projetoId),
        // Admin nao tem Meus projetos: sem participacoes, so nao posta.
        api.meusProjetos().catch(() => [])
      ]);
      setProjeto(dadosProjeto);
      setParticipantes(Array.isArray(dadosParticipantes) ? dadosParticipantes : []);
      setMeusProjetos(Array.isArray(minhasParticipacoes) ? minhasParticipacoes : []);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  async function postarAtividade(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await api.postarAtividade(projetoId, atividade);
      setModalAtividade(false);
      setAtividade({ titulo: '', descricao: '', foto: '' });
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCargo(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await api.alterarCargo(participacaoEditada.id, cargo);
      setParticipacaoEditada(null);
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  // Chamada pelo popup de confirmacao. Um erro aparece dentro do popup.
  async function removerParticipante(participante) {
    setErro('');
    await api.removerParticipante(participante.participacaoId || participante.id);
    await carregar();
  }

  if (carregando) return <p className="carregando">A carregar projeto…</p>;
  if (erro && !projeto) return <p className="aviso aviso--erro">{erro}</p>;
  if (!projeto) return null;

  const coordenador = projeto.coordenadorId === usuarioId;
  const participaAtivamente = meusProjetos.some((participacao) =>
    (participacao.projetoId === projetoId || participacao.id === projetoId) &&
    participacao.ativa !== false
  );
  const podePublicarAtividade = coordenador || participaAtivamente;
  const vagas = [...(Array.isArray(projeto.vagas) ? projeto.vagas : [])].sort((a, b) =>
    a.aberta === b.aberta ? 0 : (a.aberta ? -1 : 1)
  );
  const atividades = Array.isArray(projeto.atividades) ? projeto.atividades : [];

  return (
    <div className="pagina-projetos">
      <button className="botao voltar" type="button" onClick={aoVoltar}>Voltar para Projetos</button>
      {erro && <p className="aviso aviso--erro">{erro}</p>}

      <section className="card detalhe-cabecalho">
        <div>
          <h2>{projeto.titulo || projeto.nome || 'Projeto'}</h2>
          <p className="card__projeto">
            Situação:{' '}
            <span className={`etiqueta ${projeto.situacao === 'ATIVO' ? 'etiqueta--confirmada' : 'etiqueta--em_analise'}`}>
              {projeto.situacao || 'EM_ANDAMENTO'}
            </span>
            {projeto.area && ` · Área: ${projeto.area}`}
            {projeto.coordenadorNome && ` · Coordenação: ${projeto.coordenadorNome}`}
          </p>
          {projeto.descricao && <p className="detalhe-descricao">{projeto.descricao}</p>}
        </div>
        {podePublicarAtividade && (
          <button className="botao botao--primario" type="button" onClick={() => setModalAtividade(true)}>
            Nova atividade
          </button>
        )}
      </section>

      <section className="detalhe-secao">
        <div className="detalhe-secao__topo">
          <h3>Vagas do Projeto</h3>
          <span>{vagas.length} {vagas.length === 1 ? 'vaga registrada' : 'vagas registradas'}</span>
        </div>
        {vagas.length === 0 ? (
          <p className="aviso aviso--info">Sem vagas registradas neste projeto.</p>
        ) : (
          <div className="vagas-grade">
            {vagas.map((vaga) => {
              const abertas = Boolean(vaga.aberta);
              const restantes = Number(vaga.vagasRestantes ?? 0);
              const totais = Number(vaga.vagasTotais ?? 0);
              return (
                <article className="card vaga-card" key={vaga.id}>
                  <div className="vaga-card__topo">
                    <h4>{vaga.titulo || vaga.nome}</h4>
                    <span className={`contador ${abertas && restantes > 0 ? '' : 'contador--zero'}`}>
                      {abertas ? `${restantes} de ${totais} vagas` : 'Encerrada'}
                    </span>
                  </div>
                  <p className="card__projeto">{vaga.requisitos || 'Sem requisitos específicos'}</p>
                  <ul className="atributos">
                    {vaga.cargaHoraria && <li>{vaga.cargaHoraria}h/sem</li>}
                    {vaga.turno && <li>{vaga.turno}</li>}
                    {vaga.modalidade && <li>{vaga.modalidade}</li>}
                    {vaga.semestreMinimo && <li>{vaga.semestreMinimo}º sem+</li>}
                    {vaga.dataEncerramento && <li>Até {dataBrasileira(vaga.dataEncerramento)}</li>}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="detalhe-secao">
        <div className="detalhe-secao__topo">
          <h3>Equipe & Participantes</h3>
          <span>{participantes.length} {participantes.length === 1 ? 'membro' : 'membros'}</span>
        </div>
        {participantes.length === 0 ? (
          <p className="aviso aviso--info">Nenhum participante ativo.</p>
        ) : (
          <div className="equipe-grade">
            {participantes.map((participante) => {
              const idParticipacao = participante.participacaoId || participante.id;
              return (
                <article className="card participante-card" key={idParticipacao}>
                  <span className="avatar avatar--grande" aria-hidden="true">●</span>
                  <strong>{participante.nome || `Utilizador #${participante.usuarioId}`}</strong>
                  <span className="etiqueta">{participante.cargo || 'Membro'}</span>
                  {coordenador && (
                    <div className="participante-card__acoes">
                      <button
                        className="botao"
                        type="button"
                        onClick={() => {
                          setCargo(participante.cargo || '');
                          setParticipacaoEditada({ id: idParticipacao });
                        }}
                      >
                        Alterar cargo
                      </button>
                      <button
                        className="botao botao--perigo-suave"
                        type="button"
                        onClick={() => setParticipanteARemover(participante)}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="detalhe-secao">
        <div className="detalhe-secao__topo">
          <div>
            <h3>Atividades do Projeto</h3>
            <span>{atividades.length} {atividades.length === 1 ? 'atividade registrada' : 'atividades registradas'}</span>
          </div>
          {podePublicarAtividade && (
            <button className="botao botao--texto" type="button" onClick={() => setModalAtividade(true)}>
              Nova atividade
            </button>
          )}
        </div>
        {atividades.length === 0 ? (
          <p className="aviso aviso--info">Nenhuma atividade postada neste projeto ainda.</p>
        ) : (
          <div className="lista">
            {atividades.map((atividadeProjeto) => {
              const foto = atividadeProjeto.fotoUrl || atividadeProjeto.foto;
              return (
                <article className="card" key={atividadeProjeto.id}>
                  <header className="card__topo">
                    <div>
                      <h4>{atividadeProjeto.titulo}</h4>
                      <span className="discreto">
                        {atividadeProjeto.autorNome ? `Por ${atividadeProjeto.autorNome} · ` : ''}
                        {atividadeProjeto.publicadaEm
                          ? new Date(atividadeProjeto.publicadaEm).toLocaleDateString('pt-BR')
                          : 'Recente'}
                      </span>
                    </div>
                    <span className="etiqueta etiqueta--aceita">Atividade</span>
                  </header>
                  <p className="texto-longo">{atividadeProjeto.descricao}</p>
                  {foto && <img className="atividade-foto" src={foto} alt="" />}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Popup
        titulo="Remover participante"
        aberto={Boolean(participanteARemover)}
        aoFechar={() => setParticipanteARemover(null)}
        rotuloConfirmar="Remover"
        perigo
        aoConfirmar={() => removerParticipante(participanteARemover)}
      >
        <p>
          Tem certeza que deseja remover{' '}
          <strong>{participanteARemover?.nome || 'este participante'}</strong> da equipe?
        </p>
      </Popup>

      <Popup
        titulo="Publicar nova atividade"
        aberto={modalAtividade}
        aoFechar={() => setModalAtividade(false)}
        rodape={
          <>
            <button className="botao" type="button" onClick={() => setModalAtividade(false)}>Cancelar</button>
            <button className="botao botao--primario" type="submit" form="formAtividade" disabled={salvando}>
              {salvando ? 'Publicando…' : 'Publicar'}
            </button>
          </>
        }
      >
        <form id="formAtividade" className="formulario" onSubmit={postarAtividade}>
          <div className="campo">
            <label htmlFor="atividadeTitulo">Título</label>
            <input id="atividadeTitulo" required value={atividade.titulo} onChange={(evento) => setAtividade({ ...atividade, titulo: evento.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="atividadeDescricao">Descrição</label>
            <textarea id="atividadeDescricao" rows="3" required value={atividade.descricao} onChange={(evento) => setAtividade({ ...atividade, descricao: evento.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="atividadeFoto">URL da foto (opcional)</label>
            <input id="atividadeFoto" type="url" value={atividade.foto} onChange={(evento) => setAtividade({ ...atividade, foto: evento.target.value })} />
          </div>
        </form>
      </Popup>

      <Popup
        titulo="Alterar cargo"
        aberto={Boolean(participacaoEditada)}
        aoFechar={() => setParticipacaoEditada(null)}
        rodape={
          <button className="botao botao--primario" type="submit" form="formCargo" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        }
      >
        <form id="formCargo" className="formulario" onSubmit={salvarCargo}>
          <div className="campo">
            <label htmlFor="novoCargo">Novo cargo</label>
            <input id="novoCargo" required value={cargo} onChange={(evento) => setCargo(evento.target.value)} />
          </div>
        </form>
      </Popup>
    </div>
  );
}
