// Tela "Minha candidatura" do estudante.
//   C05 - historico do processo
//   C18 - remover candidatura (so em analise)
//   C07 - confirmar ou declinar o ingresso (so depois de aceita)
// Abre pelo card de "Minhas candidaturas" ou pelo link de uma notificacao:
// #/candidaturas/<id>.

import { useState } from 'react';
import { api } from '../servicos-api';
import { navegar } from '../navegacao';
import { useAplicacao, useDados } from '../contexto';
import { Carregando, ErroDaTela } from '../componentes/Avisos';
import { Popup } from '../componentes/Popup';
import { EtiquetaStatus, LinhaDoTempo } from '../componentes/Candidatura';

/** O que o estudante precisa saber em cada status: o que aconteceu e o que da para fazer. */
const SITUACAO = {
  EM_ANALISE:
    'A coordenação ainda não avaliou sua candidatura. Enquanto ela estiver em análise, você pode removê-la.',
  ACEITA:
    'A coordenação aceitou sua candidatura. Confirme o ingresso para entrar na equipe ou decline para liberar a vaga.',
  CONFIRMADA:
    'Você confirmou o ingresso e faz parte da equipe. A coordenação oficializa sua entrada pelos meios institucionais.',
  RECUSADA: 'A coordenação não selecionou esta candidatura.',
  DECLINADA: 'Você declinou o ingresso e a vaga foi liberada.',
  REMOVIDA: 'Você removeu esta candidatura. Se a vaga ainda estiver aberta, pode se candidatar de novo.',
  CANCELADA: 'Esta candidatura foi cancelada.'
};

export function MinhaCandidatura({ params, recarregar }) {
  const { mensagemRapida } = useAplicacao();
  const { carregando, dados: candidatura, erro } = useDados(() => api.detalharCandidatura(params.id));
  // Qual popup esta aberto: 'remover', 'declinar', 'confirmar' ou nenhum.
  const [popup, setPopup] = useState(null);
  const [motivo, setMotivo] = useState('');

  if (carregando) return <Carregando />;
  if (erro) return <ErroDaTela erro={erro} />;

  const { status } = candidatura;
  const fechar = () => setPopup(null);

  return (
    <>
      <a className="voltar" href="#/candidaturas">Minhas candidaturas</a>

      <section className="card">
        <header className="card__topo">
          <div>
            <h2 className="card__titulo">{candidatura.vagaTitulo}</h2>
            <p className="card__projeto">Vaga pleiteada</p>
          </div>
          <EtiquetaStatus status={status} />
        </header>

        <dl className="dados">
          {candidatura.coordenadorNome && (
            <div><dt>Professor coordenador</dt><dd>{candidatura.coordenadorNome}</dd></div>
          )}
          <div><dt>Projeto</dt><dd>{candidatura.projetoNome}</dd></div>
        </dl>

        {candidatura.vagaId && (
          <a className="botao" href={`#/vagas/${candidatura.vagaId}`}>Ver vaga</a>
        )}
      </section>

      {candidatura.historico?.length ? (
        <section className="card">
          <h2 className="card__titulo">Histórico do processo</h2>
          <LinhaDoTempo historico={candidatura.historico} />
        </section>
      ) : null}

      <section className="card">
        <h2 className="card__titulo">Texto de motivação enviado</h2>
        {candidatura.mensagem ? (
          <p className="texto-longo">{candidatura.mensagem}</p>
        ) : (
          <p className="discreto">Você enviou esta candidatura sem texto de motivação.</p>
        )}
      </section>

      <section className="acoes">
        <p className="acoes__situacao">{SITUACAO[status] ?? ''}</p>
        <div className="acoes__botoes">
          {status === 'EM_ANALISE' && (
            <button type="button" className="botao botao--perigo-suave" onClick={() => setPopup('remover')}>
              Remover candidatura
            </button>
          )}
          {status === 'ACEITA' && (
            <>
              <button type="button" className="botao botao--perigo-suave"
                      onClick={() => { setMotivo(''); setPopup('declinar'); }}>
                Declinar ingresso
              </button>
              <button type="button" className="botao botao--primario" onClick={() => setPopup('confirmar')}>
                Confirmar ingresso
              </button>
            </>
          )}
          {status === 'CONFIRMADA' && (
            <a className="botao" href="#/meus-projetos">Ir para Meus projetos</a>
          )}
        </div>
      </section>

      {/* C18 - Remover candidatura a vaga de projeto */}
      <Popup
        aberto={popup === 'remover'}
        aoFechar={fechar}
        titulo="Remover candidatura"
        rotuloConfirmar="Remover candidatura"
        rotuloCancelar="Manter candidatura"
        perigo
        aoConfirmar={async () => {
          await api.removerCandidatura(candidatura.id);
          mensagemRapida(`Candidatura à vaga “${candidatura.vagaTitulo}” removida.`);
          navegar('/candidaturas');
        }}
      >
        <p>
          Você deixa de concorrer à vaga <strong>{candidatura.vagaTitulo}</strong> e a
          coordenação não vê mais esta candidatura.
        </p>
        <p className="discreto">Se mudar de ideia, pode se candidatar de novo enquanto a vaga estiver aberta.</p>
      </Popup>

      {/* C07, fluxo alternativo 2.a - o estudante declina o ingresso */}
      <Popup
        aberto={popup === 'declinar'}
        aoFechar={fechar}
        titulo="Declinar ingresso"
        rotuloConfirmar="Declinar ingresso"
        perigo
        aoConfirmar={async () => {
          await api.declinarIngresso(candidatura.id, motivo.trim());
          mensagemRapida('Ingresso declinado. A vaga foi liberada e a coordenação foi avisada.');
          recarregar();
        }}
      >
        <p>
          Esta ação é irreversível: a vaga <strong>{candidatura.vagaTitulo}</strong> será
          liberada para outro candidato.
        </p>
        <div className="campo">
          <label htmlFor="motivoDoDeclinio">Motivo da recusa (opcional)</label>
          <textarea
            id="motivoDoDeclinio"
            name="motivo"
            rows="4"
            maxLength={500}
            placeholder="A coordenação do projeto vai ler este texto."
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
          />
        </div>
      </Popup>

      {/* C07, fluxo basico - o estudante confirma o ingresso */}
      <Popup
        aberto={popup === 'confirmar'}
        aoFechar={fechar}
        titulo="Confirmar ingresso"
        rotuloConfirmar="Confirmar ingresso"
        aoConfirmar={async () => {
          await api.confirmarIngresso(candidatura.id);
          mensagemRapida(`Ingresso confirmado. Você agora faz parte do projeto ${candidatura.projetoNome}.`);
          recarregar();
        }}
      >
        <p>
          Você passa a fazer parte da equipe do projeto <strong>{candidatura.projetoNome}</strong>,
          na vaga <strong>{candidatura.vagaTitulo}</strong>.
        </p>
        <p className="discreto">
          A coordenação é notificada para oficializar seu ingresso pelos meios institucionais.
        </p>
      </Popup>
    </>
  );
}
