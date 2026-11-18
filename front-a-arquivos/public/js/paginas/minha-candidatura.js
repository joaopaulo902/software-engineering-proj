// Tela "Minha candidatura" do estudante.
//   C05 - historico do processo
//   C18 - remover candidatura (so em analise)
//   C07 - confirmar ou declinar o ingresso (so depois de aceita)
// Abre pelo card de "Minhas candidaturas" ou pelo link de uma notificacao:
// #/candidaturas/<id>.

import { api } from '../servicos-api.js';
import { navegar } from '../navegacao.js';
import { escapar } from '../componentes/base.js';
import { mensagemRapida } from '../componentes/estrutura.js';
import { abrirPopup } from '../componentes/popup.js';
import { etiquetaStatus, linhaDoTempo } from '../componentes/candidatura.js';

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

export async function mostrar(conteudo, { params, recarregar }) {
  const candidatura = await api.detalharCandidatura(params.id);
  const { status } = candidatura;

  conteudo.innerHTML = `
    <a class="voltar" href="#/candidaturas">Minhas candidaturas</a>

    <section class="card">
      <header class="card__topo">
        <div>
          <h2 class="card__titulo">${escapar(candidatura.vagaTitulo)}</h2>
          <p class="card__projeto">Vaga pleiteada</p>
        </div>
        ${etiquetaStatus(status)}
      </header>

      <dl class="dados">
        ${candidatura.coordenadorNome
          ? `<div><dt>Professor coordenador</dt><dd>${escapar(candidatura.coordenadorNome)}</dd></div>`
          : ''}
        <div><dt>Projeto</dt><dd>${escapar(candidatura.projetoNome)}</dd></div>
      </dl>

      ${candidatura.vagaId
        ? `<a class="botao" href="#/vagas/${candidatura.vagaId}">Ver vaga</a>`
        : ''}
    </section>

    ${candidatura.historico?.length
      ? `<section class="card">
           <h2 class="card__titulo">Histórico do processo</h2>
           ${linhaDoTempo(candidatura.historico)}
         </section>`
      : ''}

    <section class="card">
      <h2 class="card__titulo">Texto de motivação enviado</h2>
      ${candidatura.mensagem
        ? `<p class="texto-longo">${escapar(candidatura.mensagem)}</p>`
        : '<p class="discreto">Você enviou esta candidatura sem texto de motivação.</p>'}
    </section>

    <section class="acoes">
      <p class="acoes__situacao">${escapar(SITUACAO[status] ?? '')}</p>
      <div class="acoes__botoes">
        ${status === 'EM_ANALISE'
          ? '<button type="button" class="botao botao--perigo-suave" data-remover>Remover candidatura</button>'
          : ''}
        ${status === 'ACEITA'
          ? `<button type="button" class="botao botao--perigo-suave" data-declinar>Declinar ingresso</button>
             <button type="button" class="botao botao--primario" data-confirmar>Confirmar ingresso</button>`
          : ''}
        ${status === 'CONFIRMADA'
          ? '<a class="botao" href="#/meus-projetos">Ir para Meus projetos</a>'
          : ''}
      </div>
    </section>`;

  conteudo.querySelector('[data-remover]')?.addEventListener('click', () => remover(candidatura));
  conteudo.querySelector('[data-declinar]')?.addEventListener('click', () => declinar(candidatura, recarregar));
  conteudo.querySelector('[data-confirmar]')?.addEventListener('click', () => confirmar(candidatura, recarregar));
}

/** C18 - Remover candidatura a vaga de projeto */
async function remover(candidatura) {
  const feito = await abrirPopup({
    titulo: 'Remover candidatura',
    corpo: `
      <p>
        Você deixa de concorrer à vaga <strong>${escapar(candidatura.vagaTitulo)}</strong>
        e a coordenação não vê mais esta candidatura.
      </p>
      <p class="discreto">Se mudar de ideia, pode se candidatar de novo enquanto a vaga estiver aberta.</p>`,
    rotuloConfirmar: 'Remover candidatura',
    rotuloCancelar: 'Manter candidatura',
    perigo: true,
    aoConfirmar: () => api.removerCandidatura(candidatura.id)
  });

  if (feito) {
    mensagemRapida(`Candidatura à vaga “${candidatura.vagaTitulo}” removida.`);
    navegar('/candidaturas');
  }
}

/** C07, fluxo alternativo 2.a - o estudante declina o ingresso */
async function declinar(candidatura, recarregar) {
  const feito = await abrirPopup({
    titulo: 'Declinar ingresso',
    corpo: `
      <p>
        Esta ação é irreversível: a vaga <strong>${escapar(candidatura.vagaTitulo)}</strong>
        será liberada para outro candidato.
      </p>
      <div class="campo">
        <label for="motivoDoDeclinio">Motivo da recusa (opcional)</label>
        <textarea id="motivoDoDeclinio" name="motivo" rows="4" maxlength="500"
                  placeholder="A coordenação do projeto vai ler este texto."></textarea>
      </div>`,
    rotuloConfirmar: 'Declinar ingresso',
    perigo: true,
    aoConfirmar: (popup) =>
      api.declinarIngresso(candidatura.id, popup.querySelector('[name="motivo"]').value.trim())
  });

  if (feito) {
    mensagemRapida('Ingresso declinado. A vaga foi liberada e a coordenação foi avisada.');
    recarregar();
  }
}

/** C07, fluxo basico - o estudante confirma o ingresso */
async function confirmar(candidatura, recarregar) {
  const feito = await abrirPopup({
    titulo: 'Confirmar ingresso',
    corpo: `
      <p>
        Você passa a fazer parte da equipe do projeto
        <strong>${escapar(candidatura.projetoNome)}</strong>, na vaga
        <strong>${escapar(candidatura.vagaTitulo)}</strong>.
      </p>
      <p class="discreto">
        A coordenação é notificada para oficializar seu ingresso pelos meios institucionais.
      </p>`,
    rotuloConfirmar: 'Confirmar ingresso',
    aoConfirmar: () => api.confirmarIngresso(candidatura.id)
  });

  if (feito) {
    mensagemRapida(`Ingresso confirmado. Você agora faz parte do projeto ${candidatura.projetoNome}.`);
    recarregar();
  }
}
