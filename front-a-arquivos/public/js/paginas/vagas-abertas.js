// Tela "Vagas abertas": C01 (consultar e filtrar) e o botao do C04 (candidatar-se).
// Tela da frente C. Aqui ela foi so trazida do antigo paginas.js para o arquivo
// dela. A unica novidade e o link "Acompanhar esta candidatura" depois do C04.

import { api } from '../servicos-api.js';
import { aviso } from '../componentes/base.js';
import { cardDeVaga } from '../componentes/vaga.js';

export async function mostrar(conteudo) {
  conteudo.innerHTML = `
    <form class="busca" id="formBusca">
      <input type="search" id="termo" placeholder="Buscar por título, requisito ou projeto">
      <select id="area">
        <option value="">Todas as áreas</option>
        <option value="Educação">Educação</option>
        <option value="Saúde">Saúde</option>
        <option value="Dados">Dados</option>
      </select>
      <button class="botao" type="submit">Filtrar</button>
    </form>
    <div id="listaVagas" class="lista"></div>`;

  conteudo.querySelector('#formBusca').addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarVagas(conteudo);
  });

  await carregarVagas(conteudo);
}

async function carregarVagas(conteudo) {
  const lista = conteudo.querySelector('#listaVagas');
  lista.innerHTML = '<p class="carregando">Carregando…</p>';

  const termo = conteudo.querySelector('#termo').value.trim();
  const area = conteudo.querySelector('#area').value;

  try {
    const vagas = await api.listarVagas(termo, area);

    lista.innerHTML = vagas.length
      ? vagas.map(cardDeVaga).join('')
      : aviso('Nenhuma vaga encontrada com esses filtros.', 'info');

    lista.querySelectorAll('[data-candidatar]').forEach((botao) => {
      botao.addEventListener('click', () => candidatar(Number(botao.dataset.candidatar), botao));
    });
  } catch (erro) {
    lista.innerHTML = aviso(erro.message, 'erro');
  }
}

/** C04 - Candidatar-se a Vaga de Extensao */
async function candidatar(vagaId, botao) {
  const card = botao.closest('.card');
  const retorno = card.querySelector('[data-retorno]');
  const mensagem = card.querySelector('.mensagem').value;

  botao.disabled = true;
  botao.textContent = 'Enviando…';
  retorno.innerHTML = '';

  try {
    const criada = await api.candidatar(vagaId, mensagem);

    retorno.innerHTML =
      aviso(
        `Candidatura #${criada.id} enviada. Status: Em análise. ` +
          'O coordenador do projeto foi notificado.',
        'sucesso'
      ) +
      `<a class="botao botao--texto" href="#/candidaturas/${criada.id}">Acompanhar esta candidatura</a>`;
    botao.textContent = 'Candidatura enviada';
    card.querySelector('.mensagem').disabled = true;

    // A vaga perdeu uma posicao. Atualizamos o contador no lugar, sem
    // recarregar a lista, para a mensagem de retorno continuar na tela.
    const contador = card.querySelector('.contador');
    const [restantes, totais] = contador.textContent.trim().split(' de ').map(Number);
    contador.textContent = `${restantes - 1} de ${totais}`;
    if (restantes - 1 === 0) contador.classList.add('contador--zero');
  } catch (erro) {
    retorno.innerHTML = aviso(erro.message, 'erro');
    botao.disabled = false;
    botao.textContent = 'Candidatar-se';
  }
}
