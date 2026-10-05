// Pacote `paginas` do subsistema Cliente Web.
// As telas do sistema e a navegacao entre elas.

import { api } from './servicos-api.js';
import { cardDeVaga, linhaDeCandidatura, aviso, escapar } from './componentes.js';

const tela = document.getElementById('tela');
let usuario = null;

// ---------------------------------------------------------------- entrada
async function telaDeEntrada() {
  const usuarios = await api.listarUsuarios();
  const estudantes = usuarios.filter((u) => u.papel === 'ESTUDANTE');
  const demais = usuarios.filter((u) => u.papel !== 'ESTUDANTE');

  tela.innerHTML = `
    <section class="entrada">
      <h2>Entrar no sistema</h2>
      <p class="entrada__nota">
        Login simplificado para a demonstração: escolha quem você é.
        A autenticação com credencial entra na Etapa 3.
      </p>
      <label for="usuario">Usuário</label>
      <select id="usuario">
        <optgroup label="Estudantes">
          ${estudantes
            .map(
              (u) =>
                `<option value="${u.id}">${escapar(u.nome)} — ${u.semestre}º sem., ${escapar(u.curso)}</option>`
            )
            .join('')}
        </optgroup>
        <optgroup label="Outros papéis">
          ${demais
            .map((u) => `<option value="${u.id}">${escapar(u.nome)} — ${u.papel}</option>`)
            .join('')}
        </optgroup>
      </select>
      <button class="botao botao--primario" id="btEntrar">Entrar</button>
      <p class="retorno" id="retornoEntrada"></p>
    </section>`;

  document.getElementById('btEntrar').addEventListener('click', async () => {
    const id = Number(document.getElementById('usuario').value);
    try {
      usuario = await api.entrar(id);
      await telaPrincipal('vagas');
    } catch (erro) {
      document.getElementById('retornoEntrada').innerHTML = aviso(erro.message, 'erro');
    }
  });
}

// --------------------------------------------------------------- principal
async function telaPrincipal(abaAtiva = 'vagas') {
  tela.innerHTML = `
    <header class="barra">
      <div>
        <strong>${escapar(usuario.nome)}</strong>
        <span class="papel">${usuario.papel}${
          usuario.semestre ? ` &middot; ${usuario.semestre}º semestre` : ''
        }</span>
      </div>
      <button class="botao botao--texto" id="btSair">Sair</button>
    </header>

    <nav class="abas">
      <button class="aba ${abaAtiva === 'vagas' ? 'aba--ativa' : ''}" data-aba="vagas">
        Vagas abertas
      </button>
      <button class="aba ${abaAtiva === 'minhas' ? 'aba--ativa' : ''}" data-aba="minhas">
        Minhas candidaturas
      </button>
    </nav>

    <div id="conteudo"></div>`;

  document.getElementById('btSair').addEventListener('click', async () => {
    await api.sair();
    usuario = null;
    await telaDeEntrada();
  });

  tela.querySelectorAll('[data-aba]').forEach((botao) => {
    botao.addEventListener('click', () => telaPrincipal(botao.dataset.aba));
  });

  if (abaAtiva === 'vagas') await painelDeVagas();
  else await painelDeCandidaturas();
}

// ------------------------------------------------------------ C01 + C04
async function painelDeVagas() {
  const conteudo = document.getElementById('conteudo');

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

  document.getElementById('formBusca').addEventListener('submit', (evento) => {
    evento.preventDefault();
    carregarVagas();
  });

  await carregarVagas();
}

async function carregarVagas() {
  const lista = document.getElementById('listaVagas');
  lista.innerHTML = '<p class="carregando">Carregando…</p>';

  const termo = document.getElementById('termo').value.trim();
  const area = document.getElementById('area').value;

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

    retorno.innerHTML = aviso(
      `Candidatura #${criada.id} enviada. Status: Em análise. ` +
        'O coordenador do projeto foi notificado.',
      'sucesso'
    );
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

// -------------------------------------------------------------------- C05
async function painelDeCandidaturas() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '<p class="carregando">Carregando…</p>';

  try {
    const candidaturas = await api.minhasCandidaturas();
    conteudo.innerHTML = candidaturas.length
      ? `<div class="lista">${candidaturas.map(linhaDeCandidatura).join('')}</div>`
      : aviso('Você ainda não se candidatou a nenhuma vaga.', 'info');
  } catch (erro) {
    conteudo.innerHTML = aviso(erro.message, 'erro');
  }
}

// -------------------------------------------------------------------- init
(async function iniciar() {
  try {
    usuario = await api.sessaoAtual();
    await telaPrincipal('vagas');
  } catch {
    await telaDeEntrada();
  }
})();
