// Tela "Candidatura" do coordenador.
//   C15 - ver a candidatura de um aplicante
//   C11 - avaliar: aprovar ou recusar (so enquanto esta em analise)
// Abre pelo card de "Candidaturas recebidas" ou pelo link da notificacao
// "Nova candidatura": #/candidaturas/recebidas/<id>.

import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { useAplicacao, useDados } from '../contexto';
import { dataHoraBr, iniciais } from '../formatos';
import { Carregando, ErroDaTela } from '../componentes/Avisos';
import { Popup } from '../componentes/Popup';
import { EtiquetaStatus, LinhaDoTempo, descricaoDoEstudante } from '../componentes/Candidatura';

const SITUACAO = {
  EM_ANALISE: 'Esta candidatura aguarda a sua avaliação.',
  ACEITA: 'Você aprovou esta candidatura. Falta o estudante confirmar o ingresso.',
  CONFIRMADA: 'O estudante confirmou o ingresso. Oficialize a entrada dele pelos meios institucionais.',
  RECUSADA: 'Você recusou esta candidatura.',
  DECLINADA: 'O estudante declinou o ingresso e a posição voltou a ficar disponível.',
  REMOVIDA: 'O estudante removeu esta candidatura.',
  CANCELADA: 'Esta candidatura foi cancelada.'
};

export function CandidaturaRecebida({ params, definirTitulo, recarregar }) {
  const { mensagemRapida } = useAplicacao();
  const { carregando, dados: candidatura, erro } = useDados(() => api.detalharCandidaturaRecebida(params.id));
  // A decisao em avaliacao no popup: 'ACEITAR', 'RECUSAR' ou nenhuma (enum Decisao do diagrama).
  const [decisao, setDecisao] = useState(null);

  const nomeDoEstudante = candidatura?.estudante?.nome;
  useEffect(() => {
    if (candidatura) definirTitulo(`Candidatura de ${nomeDoEstudante ?? 'estudante'}`);
  }, [candidatura, nomeDoEstudante, definirTitulo]);

  if (carregando) return <Carregando />;
  if (erro) return <ErroDaTela erro={erro} />;

  const estudante = candidatura.estudante ?? {};
  const { status } = candidatura;
  const nome = estudante.nome ?? 'o estudante';
  const aprovar = decisao === 'ACEITAR';

  return (
    <>
      <a className="voltar" href="#/candidaturas/recebidas">Candidaturas recebidas</a>

      <section className="card">
        <header className="card__topo">
          <div className="pessoa">
            <span className="avatar avatar--grande" aria-hidden="true">{iniciais(estudante.nome)}</span>
            <div>
              <h2 className="card__titulo">{estudante.nome}</h2>
              <p className="card__projeto">{descricaoDoEstudante(estudante)}</p>
            </div>
          </div>
          <EtiquetaStatus status={status} />
        </header>

        <dl className="dados">
          <div><dt>Vaga</dt><dd>{candidatura.vagaTitulo}</dd></div>
          {candidatura.projetoNome && <div><dt>Projeto</dt><dd>{candidatura.projetoNome}</dd></div>}
          <div><dt>Recebida em</dt><dd>{dataHoraBr(candidatura.criadaEm)}</dd></div>
        </dl>

        {estudante.id && <a className="botao" href={`#/usuarios/${estudante.id}`}>Ver perfil</a>}
      </section>

      <section className="card">
        <h2 className="card__titulo">Texto de motivação</h2>
        {candidatura.mensagem ? (
          <p className="texto-longo">{candidatura.mensagem}</p>
        ) : (
          <p className="discreto">O estudante enviou a candidatura sem texto de motivação.</p>
        )}
      </section>

      {candidatura.historico?.length ? (
        <section className="card">
          <h2 className="card__titulo">Histórico do processo</h2>
          <LinhaDoTempo historico={candidatura.historico} />
        </section>
      ) : null}

      <section className="acoes">
        <p className="acoes__situacao">{SITUACAO[status] ?? ''}</p>
        <div className="acoes__botoes">
          {status === 'EM_ANALISE' && (
            <>
              <button type="button" className="botao botao--perigo-suave" onClick={() => setDecisao('RECUSAR')}>
                Recusar
              </button>
              {/* ENCAIXE da frente C: o botao "Denunciar" (C13) entra aqui, entre Recusar e Aprovar. */}
              <button type="button" className="botao botao--primario" onClick={() => setDecisao('ACEITAR')}>
                Aprovar
              </button>
            </>
          )}
        </div>
      </section>

      {/* C11 - Avaliar Candidatura do Estudante */}
      <Popup
        aberto={decisao !== null}
        aoFechar={() => setDecisao(null)}
        titulo={aprovar ? 'Aprovar candidatura' : 'Recusar candidatura'}
        rotuloConfirmar={aprovar ? 'Aprovar' : 'Recusar'}
        perigo={!aprovar}
        aoConfirmar={async () => {
          await api.avaliarCandidatura(candidatura.id, decisao);
          mensagemRapida(
            aprovar
              ? `Candidatura de ${nome} aprovada. Falta o estudante confirmar o ingresso.`
              : `Candidatura de ${nome} recusada.`
          );
          recarregar();
        }}
      >
        {aprovar ? (
          <p>
            <strong>{nome}</strong> é notificado e precisa confirmar o ingresso na vaga{' '}
            <strong>{candidatura.vagaTitulo}</strong>. A posição fica reservada até lá.
          </p>
        ) : (
          <>
            <p>
              <strong>{nome}</strong> é notificado de que não foi selecionado para a vaga{' '}
              <strong>{candidatura.vagaTitulo}</strong>, e a posição volta a ficar disponível.
            </p>
            <p className="discreto">Depois de recusada, a candidatura não pode ser reavaliada.</p>
          </>
        )}
      </Popup>
    </>
  );
}
