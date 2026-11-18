// Tela de entrada. E a unica fora da estrutura comum (sem menu nem cabecalho).

import { api } from '../servicos-api.js';
import { entrar } from '../sessao.js';
import { aviso, escapar } from '../componentes/base.js';

/**
 * SIMPLIFICACAO DECLARADA: o usuario e escolhido numa lista, sem senha.
 * Login com senha e bloqueio esta no nivel 3 da divisao do trabalho.
 */
export async function mostrarEntrada(app, { aoEntrar }) {
  app.innerHTML = `
    <main class="pagina-de-entrada">
      <h1 class="titulo">Connext</h1>
      <p class="subtitulo">Conexão entre projetos de extensão e alunos do INF</p>
      <section class="entrada" id="entrada"><p class="carregando">Carregando…</p></section>
    </main>`;

  const caixa = app.querySelector('#entrada');

  let usuarios;
  try {
    usuarios = await api.listarUsuarios();
  } catch (erro) {
    caixa.innerHTML = aviso(erro.message, 'erro');
    return;
  }

  const estudantes = usuarios.filter((u) => u.papel === 'ESTUDANTE');
  const demais = usuarios.filter((u) => u.papel !== 'ESTUDANTE');

  caixa.innerHTML = `
    <h2>Entrar no sistema</h2>
    <p class="entrada__nota">
      Login simplificado para a demonstração: escolha quem você é.
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
    <p class="retorno" id="retornoEntrada"></p>`;

  caixa.querySelector('#btEntrar').addEventListener('click', async () => {
    const id = Number(caixa.querySelector('#usuario').value);
    try {
      await entrar(id);
      aoEntrar();
    } catch (erro) {
      caixa.querySelector('#retornoEntrada').innerHTML = aviso(erro.message, 'erro');
    }
  });
}
