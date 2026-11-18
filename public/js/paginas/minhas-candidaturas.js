// Tela "Minhas candidaturas" do estudante: C05 - Acompanhar Status das Candidaturas.
// Cada card leva a tela "Minha candidatura".

import { api } from '../servicos-api.js';
import { aviso, normalizar } from '../componentes/base.js';
import {
  cardDeCandidatura,
  barraDeFiltro,
  ligarBarraDeFiltro
} from '../componentes/candidatura.js';

const STATUS_DO_FILTRO = ['EM_ANALISE', 'ACEITA', 'CONFIRMADA', 'RECUSADA', 'DECLINADA'];

export async function mostrar(conteudo) {
  const candidaturas = await api.minhasCandidaturas();

  // Pre-condicao do C05: ter ao menos uma candidatura. Sem nenhuma, a tela
  // diz qual e o proximo passo em vez de mostrar uma lista vazia.
  if (candidaturas.length === 0) {
    conteudo.innerHTML = `
      <section class="vazio">
        <h2>Você ainda não se candidatou a nenhuma vaga</h2>
        <p>As vagas com inscrição aberta estão em Vagas abertas.</p>
        <a class="botao botao--primario" href="#/vagas">Ver vagas abertas</a>
      </section>`;
    return;
  }

  conteudo.innerHTML = `
    ${barraDeFiltro({
      dica: 'Pesquisar por vaga, projeto ou professor',
      statusDisponiveis: STATUS_DO_FILTRO
    })}
    <div class="lista" data-lista></div>`;

  const lista = conteudo.querySelector('[data-lista]');

  // A lista do estudante e pequena e ja veio inteira: o filtro roda aqui
  // mesmo, sem ir de novo ao servidor.
  const lerFiltro = ligarBarraDeFiltro(conteudo, desenhar);

  function desenhar() {
    const { termo, status } = lerFiltro();
    const procurado = normalizar(termo);

    const visiveis = candidaturas.filter((c) => {
      if (status.length > 0 && !status.includes(c.status)) return false;
      if (!procurado) return true;
      return normalizar(`${c.vagaTitulo} ${c.projetoNome} ${c.coordenadorNome}`).includes(procurado);
    });

    lista.innerHTML = visiveis.length
      ? visiveis.map(cardDeCandidatura).join('')
      : aviso('Nenhuma candidatura com esses filtros.', 'info');
  }

  desenhar();
}
