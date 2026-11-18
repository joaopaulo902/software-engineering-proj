// Tela "Candidatura" do coordenador.
//   C15 - ver a candidatura de um aplicante
//   C11 - avaliar: aprovar ou recusar (so enquanto esta em analise)
// Abre pelo card de "Candidaturas recebidas" ou pelo link da notificacao
// "Nova candidatura": #/candidaturas/recebidas/<id>.

import { api } from '../servicos-api.js';
import { escapar, iniciais, dataHoraBr } from '../componentes/base.js';
import { mensagemRapida } from '../componentes/estrutura.js';
import { abrirPopup } from '../componentes/popup.js';
import {
  etiquetaStatus,
  linhaDoTempo,
  descricaoDoEstudante
} from '../componentes/candidatura.js';

const SITUACAO = {
  EM_ANALISE: 'Esta candidatura aguarda a sua avaliação.',
  ACEITA: 'Você aprovou esta candidatura. Falta o estudante confirmar o ingresso.',
  CONFIRMADA: 'O estudante confirmou o ingresso. Oficialize a entrada dele pelos meios institucionais.',
  RECUSADA: 'Você recusou esta candidatura.',
  DECLINADA: 'O estudante declinou o ingresso e a posição voltou a ficar disponível.',
  REMOVIDA: 'O estudante removeu esta candidatura.',
  CANCELADA: 'Esta candidatura foi cancelada.'
};

export async function mostrar(conteudo, { params, definirTitulo, recarregar }) {
  const candidatura = await api.detalharCandidaturaRecebida(params.id);
  const estudante = candidatura.estudante ?? {};
  const { status } = candidatura;

  definirTitulo(`Candidatura de ${estudante.nome ?? 'estudante'}`);

  conteudo.innerHTML = `
    <a class="voltar" href="#/candidaturas/recebidas">Candidaturas recebidas</a>

    <section class="card">
      <header class="card__topo">
        <div class="pessoa">
          <span class="avatar avatar--grande" aria-hidden="true">${escapar(iniciais(estudante.nome))}</span>
          <div>
            <h2 class="card__titulo">${escapar(estudante.nome)}</h2>
            <p class="card__projeto">${escapar(descricaoDoEstudante(estudante))}</p>
          </div>
        </div>
        ${etiquetaStatus(status)}
      </header>

      <dl class="dados">
        <div><dt>Vaga</dt><dd>${escapar(candidatura.vagaTitulo)}</dd></div>
        ${candidatura.projetoNome
          ? `<div><dt>Projeto</dt><dd>${escapar(candidatura.projetoNome)}</dd></div>`
          : ''}
        <div><dt>Recebida em</dt><dd>${dataHoraBr(candidatura.criadaEm)}</dd></div>
      </dl>

      ${estudante.id ? `<a class="botao" href="#/usuarios/${estudante.id}">Ver perfil</a>` : ''}
    </section>

    <section class="card">
      <h2 class="card__titulo">Texto de motivação</h2>
      ${candidatura.mensagem
        ? `<p class="texto-longo">${escapar(candidatura.mensagem)}</p>`
        : '<p class="discreto">O estudante enviou a candidatura sem texto de motivação.</p>'}
    </section>

    ${candidatura.historico?.length
      ? `<section class="card">
           <h2 class="card__titulo">Histórico do processo</h2>
           ${linhaDoTempo(candidatura.historico)}
         </section>`
      : ''}

    <section class="acoes">
      <p class="acoes__situacao">${escapar(SITUACAO[status] ?? '')}</p>
      <div class="acoes__botoes">
        ${status === 'EM_ANALISE'
          ? `<button type="button" class="botao botao--perigo-suave" data-recusar>Recusar</button>
             <!-- ENCAIXE da frente C: o botao "Denunciar" (C13) entra aqui, entre Recusar e Aprovar. -->
             <button type="button" class="botao botao--primario" data-aprovar>Aprovar</button>`
          : ''}
      </div>
    </section>`;

  conteudo.querySelector('[data-aprovar]')?.addEventListener('click', () =>
    avaliar(candidatura, 'ACEITAR', recarregar)
  );
  conteudo.querySelector('[data-recusar]')?.addEventListener('click', () =>
    avaliar(candidatura, 'RECUSAR', recarregar)
  );
}

/** C11 - Avaliar Candidatura do Estudante. `decisao` e o enum Decisao do diagrama. */
async function avaliar(candidatura, decisao, recarregar) {
  const nome = candidatura.estudante?.nome ?? 'o estudante';
  const aprovar = decisao === 'ACEITAR';

  const feito = await abrirPopup({
    titulo: aprovar ? 'Aprovar candidatura' : 'Recusar candidatura',
    corpo: aprovar
      ? `<p>
           <strong>${escapar(nome)}</strong> é notificado e precisa confirmar o ingresso na vaga
           <strong>${escapar(candidatura.vagaTitulo)}</strong>. A posição fica reservada até lá.
         </p>`
      : `<p>
           <strong>${escapar(nome)}</strong> é notificado de que não foi selecionado para a vaga
           <strong>${escapar(candidatura.vagaTitulo)}</strong>, e a posição volta a ficar disponível.
         </p>
         <p class="discreto">Depois de recusada, a candidatura não pode ser reavaliada.</p>`,
    rotuloConfirmar: aprovar ? 'Aprovar' : 'Recusar',
    perigo: !aprovar,
    aoConfirmar: () => api.avaliarCandidatura(candidatura.id, decisao)
  });

  if (feito) {
    mensagemRapida(
      aprovar
        ? `Candidatura de ${nome} aprovada. Falta o estudante confirmar o ingresso.`
        : `Candidatura de ${nome} recusada.`
    );
    recarregar();
  }
}
