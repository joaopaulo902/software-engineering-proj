import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { Popup } from '../componentes/Popup';
import { dataBr, listaEmPortugues } from '../formatos';
import { navegar } from '../navegacao';

const LIMITE_DA_MENSAGEM = 500;

/**
 * C03 - Visualizar Detalhes da Vaga, com o botao do C04.
 *
 * O servidor diz se quem esta vendo pode se candidatar e, se nao pode, por que
 * (a mesma regra que o C04 usa). O botao fica desabilitado com esse motivo.
 */
export function DetalhesDaVaga({ params, usuario }) {
  const vagaId = params.id;
  const [vaga, setVaga] = useState(null);
  const [erro, setErro] = useState('');
  const [popupAberto, setPopupAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroDoPopup, setErroDoPopup] = useState('');

  useEffect(() => {
    setVaga(null);
    setErro('');
    api.vaga(vagaId)
      .then(setVaga)
      .catch((falha) => {
        setErro(falha.message);
      });
  }, [vagaId]);

  async function candidatar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErroDoPopup('');
    try {
      const candidatura = await api.candidatar(vaga.id, mensagem);
      // Pos-condicao do C04: candidatura Em Analise. O estudante vai direto para ela.
      navegar(`/candidaturas/${candidatura.id}`);
    } catch (falha) {
      setErroDoPopup(falha.message);
      setEnviando(false);
    }
  }

  function fechar() {
    // Volta para onde o usuario estava; aberta direto pelo endereco, vai para a lista.
    if (window.history.length > 1) window.history.back();
    else navegar('/vagas');
  }

  if (erro) {
    return (
      <div className="pagina-projetos">
        <button type="button" className="botao botao--texto voltar" onClick={() => navegar('/vagas')}>
          Vagas abertas
        </button>
        <p className="aviso aviso--erro">{erro}</p>
      </div>
    );
  }
  if (!vaga) return <p className="carregando">Carregando vaga…</p>;

  const ehEstudante = usuario?.papel === 'ESTUDANTE';
  const cursos = vaga.cursosAceitos?.length ? listaEmPortugues(vaga.cursosAceitos) : 'Todos os cursos';

  return (
    <div className="pagina-projetos">
      <button type="button" className="botao botao--texto voltar" onClick={fechar}>Voltar</button>

      <section className="card detalhe-vaga">
        <header className="detalhe-cabecalho">
          <div>
            <h2>{vaga.titulo}</h2>
            <div className="vaga-areas">
              <button type="button" className="etiqueta etiqueta--botao"
                      onClick={() => navegar(`/projetos/${vaga.projetoId}`)}>
                {vaga.projetoNome}
              </button>
              <span className="etiqueta">Responsável: {vaga.coordenadorNome}</span>
              {vaga.areasTematicas?.map((area) => (
                <span className="etiqueta etiqueta--aceita" key={area}>{area}</span>
              ))}
            </div>
          </div>
          <span className={`contador ${vaga.vagasRestantes === 0 ? 'contador--zero' : ''}`}>
            {vaga.aberta ? `${vaga.vagasRestantes} de ${vaga.vagasTotais}` : 'Encerrada'}
          </span>
        </header>

        <dl className="detalhe-vaga__dados">
          <div><dt>Carga horária</dt><dd>{vaga.cargaHoraria}h semanais</dd></div>
          <div><dt>Turno</dt><dd>{vaga.turno}</dd></div>
          <div><dt>Modo de operação</dt><dd>{vaga.modalidade}</dd></div>
          <div><dt>Nº de vagas</dt><dd>{vaga.vagasRestantes} livres de {vaga.vagasTotais}</dd></div>
          <div><dt>Inscrições até</dt><dd>{dataBr(vaga.dataEncerramento)}</dd></div>
          <div><dt>Benefício</dt><dd>{vaga.beneficio}</dd></div>
          <div>
            <dt>Duração</dt>
            <dd>{vaga.duracaoEmMeses ? `${vaga.duracaoEmMeses} ${vaga.duracaoEmMeses === 1 ? 'mês' : 'meses'}` : 'Sem prazo definido'}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h3 className="detalhe-vaga__subtitulo">Pré-requisitos</h3>
        <dl className="detalhe-vaga__dados">
          <div><dt>Curso(s)</dt><dd>{cursos}</dd></div>
          <div><dt>Semestre mínimo</dt><dd>{vaga.semestreMinimo}º</dd></div>
          <div className="detalhe-vaga__largo"><dt>Outros</dt><dd>{vaga.requisitos}</dd></div>
        </dl>
      </section>

      {vaga.descricao && (
        <section className="card">
          <h3 className="detalhe-vaga__subtitulo">Descrição da vaga e filosofia de trabalho</h3>
          <p className="texto-longo">{vaga.descricao}</p>
        </section>
      )}

      <div className="detalhe-vaga__acoes">
        <button type="button" className="botao" onClick={fechar}>Fechar</button>
        {ehEstudante ? (
          <div className="detalhe-vaga__candidatar">
            <button
              type="button"
              className="botao botao--primario"
              disabled={!vaga.podeSeCandidatar}
              onClick={() => { setMensagem(''); setErroDoPopup(''); setPopupAberto(true); }}
            >
              Candidatar-se à vaga
            </button>
            {!vaga.podeSeCandidatar && <p className="detalhe-vaga__motivo">{vaga.motivoDeInelegibilidade}</p>}
          </div>
        ) : usuario?.papel === 'COORDENADOR' ? (
          <button type="button" className="botao"
                  onClick={() => navegar(`/candidaturas/recebidas?vagaId=${vaga.id}`)}>
            Ver candidaturas desta vaga
          </button>
        ) : null}
      </div>

      <Popup
        titulo="Candidatar-se à vaga"
        aberto={popupAberto}
        aoFechar={() => { if (!enviando) setPopupAberto(false); }}
      >
        <form className="formulario" onSubmit={candidatar}>
          <p>
            Sua candidatura para <strong>{vaga.titulo}</strong> vai para {vaga.coordenadorNome},
            junto com o seu perfil.
          </p>
          <div className="campo">
            <label htmlFor="mensagemDeMotivacao">Texto de motivação (opcional)</label>
            <textarea
              id="mensagemDeMotivacao"
              rows="5"
              maxLength={LIMITE_DA_MENSAGEM}
              value={mensagem}
              onChange={(evento) => setMensagem(evento.target.value)}
              placeholder="Por que você quer participar desta vaga?"
            />
            <span className="discreto">{mensagem.length}/{LIMITE_DA_MENSAGEM}</span>
          </div>
          {erroDoPopup && <p className="aviso aviso--erro">{erroDoPopup}</p>}
          <div className="popup__acoes">
            <button type="button" className="botao" disabled={enviando} onClick={() => setPopupAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar candidatura'}
            </button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
