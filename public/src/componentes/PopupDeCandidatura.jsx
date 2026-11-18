// Popup "Candidatar-se ao projeto" da Pagina do Projeto (C04), como no
// prototipo do estudante: um texto de motivacao, "Excluir" e "Confirmar", e
// depois um aviso de que a inscricao foi feita.
//
// O texto fica guardado no navegador (localStorage) enquanto o estudante
// escreve: fechar o popup e voltar depois nao perde o rascunho. So o botao
// "Excluir rascunho" ou o envio da candidatura apagam o texto guardado.

import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { Popup } from './Popup';
import { dataBr } from '../formatos';
import { navegar } from '../navegacao';

const LIMITE_DA_MENSAGEM = 500;

function chaveDoRascunho(usuarioId, vagaId) {
  return `connext:rascunho-candidatura:${usuarioId ?? 'anonimo'}:${vagaId}`;
}

// O armazenamento pode estar bloqueado (aba anonima, cookies desligados):
// nesse caso o popup funciona normalmente, so sem guardar o rascunho.
function lerRascunho(chave) {
  try {
    return window.localStorage.getItem(chave) ?? '';
  } catch {
    return '';
  }
}

function guardarRascunho(chave, texto) {
  try {
    if (texto) window.localStorage.setItem(chave, texto);
    else window.localStorage.removeItem(chave);
  } catch {
    /* sem armazenamento: segue sem rascunho */
  }
}

/**
 * vaga       a vaga do card clicado (formato de GET /api/projetos/:id)
 * usuarioId  quem esta logado; separa os rascunhos de cada estudante
 * aoFechar   chamada no X, no Esc, no clique fora e nos botoes de saida
 */
export function PopupDeCandidatura({ vaga, usuarioId, aoFechar }) {
  const aberto = Boolean(vaga);
  const chave = vaga ? chaveDoRascunho(usuarioId, vaga.id) : null;

  // O servidor diz se este estudante pode se candidatar e, se nao, por que.
  const [elegibilidade, setElegibilidade] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [candidatura, setCandidatura] = useState(null);

  useEffect(() => {
    if (!vaga) return undefined;
    let ativa = true;
    setMensagem(lerRascunho(chave));
    setElegibilidade(null);
    setErro('');
    setEnviando(false);
    setCandidatura(null);
    api.vaga(vaga.id)
      .then((detalhe) => {
        if (ativa) setElegibilidade({ pode: detalhe.podeSeCandidatar, motivo: detalhe.motivoDeInelegibilidade });
      })
      .catch((falha) => {
        if (ativa) setElegibilidade({ pode: false, motivo: falha.message });
      });
    return () => {
      ativa = false;
    };
  }, [vaga, chave]);

  if (!aberto) return null;

  function escrever(texto) {
    setMensagem(texto);
    guardarRascunho(chave, texto);
  }

  function excluirRascunho() {
    guardarRascunho(chave, '');
    setMensagem('');
    aoFechar();
  }

  function fechar() {
    if (!enviando) aoFechar();
  }

  async function confirmar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const criada = await api.candidatar(vaga.id, mensagem);
      guardarRascunho(chave, '');
      setCandidatura(criada);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  // Depois do envio: o "popup com confirmacao de inscricao" do prototipo.
  if (candidatura) {
    return (
      <Popup
        titulo="Inscrição confirmada"
        aberto
        aoFechar={aoFechar}
        rodape={
          <>
            <button className="botao" type="button" onClick={aoFechar}>Fechar</button>
            <button
              className="botao botao--primario"
              type="button"
              onClick={() => navegar(`/candidaturas/${candidatura.id}`)}
            >
              Ver minha candidatura
            </button>
          </>
        }
      >
        <p className="aviso aviso--sucesso">
          Sua candidatura para <strong>{vaga.titulo || vaga.nome}</strong> foi enviada e está em análise.
        </p>
        <p>
          {vaga.coordenadorNome ? <>{vaga.coordenadorNome} vai receber</> : <>A coordenação vai receber</>}{' '}
          o seu texto de motivação junto com o link para o seu perfil. Você acompanha o andamento em
          Minhas candidaturas.
        </p>
      </Popup>
    );
  }

  const carregandoElegibilidade = elegibilidade === null;
  const podeEnviar = !carregandoElegibilidade && elegibilidade.pode && !enviando;

  return (
    <Popup
      titulo="Candidatar-se ao projeto"
      aberto
      aoFechar={fechar}
      rodape={
        <>
          <button
            className="botao botao--perigo-suave"
            type="button"
            onClick={excluirRascunho}
            disabled={enviando}
          >
            Excluir rascunho
          </button>
          <button className="botao botao--primario" type="submit" form="formCandidaturaNoProjeto" disabled={!podeEnviar}>
            {enviando ? 'Enviando…' : 'Confirmar'}
          </button>
        </>
      }
    >
      <form id="formCandidaturaNoProjeto" className="formulario" onSubmit={confirmar}>
        <div className="candidatura-vaga">
          <div className="vaga-card__topo">
            <h4>{vaga.titulo || vaga.nome}</h4>
            <span className={`contador ${vaga.aberta && Number(vaga.vagasRestantes) > 0 ? '' : 'contador--zero'}`}>
              {vaga.aberta ? `${vaga.vagasRestantes} de ${vaga.vagasTotais} vagas` : 'Encerrada'}
            </span>
          </div>
          {vaga.areasTematicas?.length > 0 && (
            <div className="vaga-areas">
              {vaga.areasTematicas.map((area) => (
                <span className="etiqueta etiqueta--aceita" key={area}>{area}</span>
              ))}
            </div>
          )}
          <ul className="atributos">
            {vaga.cargaHoraria && <li>{vaga.cargaHoraria}h/sem</li>}
            {vaga.turno && <li>{vaga.turno}</li>}
            {vaga.modalidade && <li>{vaga.modalidade}</li>}
            {vaga.dataEncerramento && <li>Até {dataBr(vaga.dataEncerramento)}</li>}
          </ul>
          <button
            type="button"
            className="botao botao--texto candidatura-vaga__detalhes"
            onClick={() => navegar(`/vagas/${vaga.id}`)}
          >
            Ver detalhes da vaga →
          </button>
        </div>

        <div className="campo">
          <label htmlFor="mensagemNoProjeto">Texto com motivação e resumo da aplicação</label>
          <textarea
            id="mensagemNoProjeto"
            rows="6"
            maxLength={LIMITE_DA_MENSAGEM}
            value={mensagem}
            onChange={(evento) => escrever(evento.target.value)}
            placeholder="Por que você quer participar desta vaga? Conte um pouco da sua experiência."
            disabled={enviando}
          />
          <span className="discreto candidatura-vaga__rodape">
            <span>O rascunho fica salvo neste navegador até você enviar ou excluir.</span>
            <span>{mensagem.length}/{LIMITE_DA_MENSAGEM}</span>
          </span>
        </div>

        {carregandoElegibilidade ? (
          <p className="discreto">Verificando se você pode se candidatar…</p>
        ) : !elegibilidade.pode ? (
          <p className="aviso aviso--erro">{elegibilidade.motivo || 'Não é possível se candidatar a esta vaga.'}</p>
        ) : null}
        {erro && <p className="aviso aviso--erro" role="alert">{erro}</p>}
      </form>
    </Popup>
  );
}
