import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { Modal } from '../componentes/Modal';

function brDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function DetalhesDoProjeto({ projetoId, usuarioId, meusProjetos, aoVoltar, aoAlterar }) {
  const [projeto, setProjeto] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAtividade, setModalAtividade] = useState(false);
  const [modalCargo, setModalCargo] = useState(null);
  const [atividade, setAtividade] = useState({ titulo: '', descricao: '', foto: '' });
  const [cargo, setCargo] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const [dados, equipe] = await Promise.all([api.projeto(projetoId), api.participantes(projetoId)]);
      setProjeto(dados);
      setParticipantes(Array.isArray(equipe) ? equipe : []);
    } catch (erroCarregamento) {
      setErro(erroCarregamento.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, [projetoId]);

  async function postarAtividade(event) {
    event.preventDefault();
    try {
      await api.postarAtividade(projetoId, atividade);
      setModalAtividade(false);
      setAtividade({ titulo: '', descricao: '', foto: '' });
      await carregar();
    } catch (erroPostagem) {
      setErro(erroPostagem.message);
    }
  }

  async function salvarCargo(event) {
    event.preventDefault();
    try {
      await api.alterarCargo(modalCargo.id, cargo);
      setModalCargo(null);
      await carregar();
      await aoAlterar();
    } catch (erroCargo) {
      setErro(erroCargo.message);
    }
  }

  async function remover(participante) {
    if (!window.confirm('Tem certeza que deseja remover este participante?')) return;
    try {
      await api.removerParticipante(participante.participacaoId || participante.id);
      await carregar();
      await aoAlterar();
    } catch (erroRemocao) {
      setErro(erroRemocao.message);
    }
  }

  if (carregando) return <p className="carregando">A carregar projeto…</p>;
  if (erro) return <p className="aviso aviso--erro">{erro}</p>;
  if (!projeto) return null;

  const coordenador = projeto.coordenadorId === usuarioId;
  const participanteAtivo = meusProjetos.some((item) =>
    (item.projetoId === projetoId || item.id === projetoId) && item.ativa !== false
  );
  const podePostar = coordenador || participanteAtivo;
  const vagas = [...(Array.isArray(projeto.vagas) ? projeto.vagas : [])].sort((a, b) =>
    (b.aberta === a.aberta) ? 0 : (a.aberta ? 1 : -1)
  );
  const atividades = Array.isArray(projeto.atividades) ? projeto.atividades : [];

  return (
    <>
      <button className="botao voltar" type="button" onClick={aoVoltar}>Voltar para Projetos</button>
      <div className="card detalhe-cabecalho">
        <div>
          <h2>{projeto.titulo || projeto.nome || 'Projeto'}</h2>
          <p className="card__projeto">
            Situação: <span className={`etiqueta ${projeto.situacao === 'ATIVO' ? 'etiqueta--confirmada' : 'etiqueta--em_analise'}`}>{projeto.situacao || 'EM_ANDAMENTO'}</span>
            {projeto.area && ` · Área: ${projeto.area}`}
            {projeto.coordenadorNome && ` · Coordenação: ${projeto.coordenadorNome}`}
          </p>
          {projeto.descricao && <p className="detalhe-descricao">{projeto.descricao}</p>}
        </div>
        {podePostar && <button className="botao botao--primario" type="button" onClick={() => setModalAtividade(true)}>Nova atividade</button>}
      </div>

      <section className="detalhe-secao">
        <div className="detalhe-secao__topo">
          <h3>Vagas do Projeto</h3>
          <span>{vagas.length} {vagas.length === 1 ? 'vaga registrada' : 'vagas registradas'}</span>
        </div>
        {vagas.length === 0 ? <p className="aviso aviso--info">Sem vagas registradas neste projeto.</p> : (
          <div className="vagas-grade">
            {vagas.map((vaga) => (
              <article className="card vaga-card" key={vaga.id}>
                <div className="vaga-card__topo">
                  <h4>{vaga.titulo || vaga.nome}</h4>
                  <span className={`contador ${vaga.aberta && vaga.vagasRestantes > 0 ? '' : 'contador--zero'}`}>
                    {vaga.aberta ? `${vaga.vagasRestantes ?? 0} de ${vaga.vagasTotais ?? 0}` : 'Encerrada'}
                  </span>
                </div>
                <p className="card__projeto">{vaga.requisitos || 'Sem requisitos específicos'}</p>
                <ul className="atributos">
                  {vaga.cargaHoraria && <li>{vaga.cargaHoraria}h/sem</li>}
                  {vaga.turno && <li>{vaga.turno}</li>}
                  {vaga.modalidade && <li>{vaga.modalidade}</li>}
                  {vaga.semestreMinimo && <li>{vaga.semestreMinimo}º sem+</li>}
                  {vaga.dataEncerramento && <li>Até {brDate(vaga.dataEncerramento)}</li>}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detalhe-secao">
        <div className="detalhe-secao__topo">
          <h3>Equipe & Participantes</h3>
          <span>{participantes.length} {participantes.length === 1 ? 'membro' : 'membros'}</span>
        </div>
        {participantes.length === 0 ? <p className="aviso aviso--info">Nenhum participante ativo.</p> : (
          <div className="equipe-grade">
            {participantes.map((participante) => (
              <article className="card participante-card" key={participante.participacaoId || participante.id}>
                <div className="avatar">●</div>
                <strong>{participante.nome || `Utilizador #${participante.usuarioId}`}</strong>
                <span className="etiqueta">{participante.cargo || 'Membro'}</span>
                {coordenador && (
                  <div className="participante-card__acoes">
                    <button className="botao" type="button" onClick={() => { setCargo(participante.cargo || ''); setModalCargo({ id: participante.participacaoId || participante.id }); }}>Editar cargo</button>
                    <button className="botao botao--perigo-suave" type="button" onClick={() => remover(participante)}>Remover</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detalhe-secao">
        <div className="detalhe-secao__topo">
          <h3>Atividades do Projeto</h3>
          {podePostar && <button className="botao botao--texto" type="button" onClick={() => setModalAtividade(true)}>Nova atividade</button>}
        </div>
        <div className="lista">
          {atividades.length === 0 ? <p className="aviso aviso--info">Nenhuma atividade postada neste projeto ainda.</p> : atividades.map((item) => (
            <article className="card" key={item.id}>
              <header className="card__topo">
                <div><h4>{item.titulo}</h4><span className="discreto">{item.autorNome ? `Por ${item.autorNome} · ` : ''}{item.publicadaEm ? new Date(item.publicadaEm).toLocaleDateString('pt-BR') : 'Recente'}</span></div>
                <span className="etiqueta etiqueta--aceita">Atividade</span>
              </header>
              <p className="texto-longo">{item.descricao}</p>
              {(item.fotoUrl || item.foto) && <img className="atividade-foto" src={item.fotoUrl || item.foto} alt="" />}
            </article>
          ))}
        </div>
      </section>

      <Modal titulo="Publicar nova atividade" aberto={modalAtividade} aoFechar={() => setModalAtividade(false)}
        rodape={<><button className="botao" type="button" onClick={() => setModalAtividade(false)}>Cancelar</button><button className="botao botao--primario" type="submit" form="formAtividade">Publicar</button></>}>
        <form id="formAtividade" className="formulario" onSubmit={postarAtividade}>
          <div className="campo"><label htmlFor="atividadeTitulo">Título</label><input id="atividadeTitulo" required value={atividade.titulo} onChange={(event) => setAtividade({ ...atividade, titulo: event.target.value })} /></div>
          <div className="campo"><label htmlFor="atividadeDescricao">Descrição</label><textarea id="atividadeDescricao" rows="3" required value={atividade.descricao} onChange={(event) => setAtividade({ ...atividade, descricao: event.target.value })} /></div>
          <div className="campo"><label htmlFor="atividadeFoto">URL da foto</label><input id="atividadeFoto" type="url" value={atividade.foto} onChange={(event) => setAtividade({ ...atividade, foto: event.target.value })} /></div>
        </form>
      </Modal>

      <Modal titulo="Alterar cargo" aberto={Boolean(modalCargo)} aoFechar={() => setModalCargo(null)}
        rodape={<button className="botao botao--primario" type="submit" form="formCargo">Salvar</button>}>
        <form id="formCargo" className="formulario" onSubmit={salvarCargo}>
          <div className="campo"><label htmlFor="novoCargo">Novo cargo</label><input id="novoCargo" required value={cargo} onChange={(event) => setCargo(event.target.value)} /></div>
        </form>
      </Modal>
    </>
  );
}
