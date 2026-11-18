// Tela "Ofertar nova vaga": C06. Tela da frente C. Aqui ela foi so trazida do
// antigo paginas.js para o arquivo dela, sem mudar o comportamento.

import { api } from '../servicos-api.js';
import { aviso } from '../componentes/base.js';
import { formularioDeVaga } from '../componentes/vaga.js';

export async function mostrar(conteudo) {
  const projetos = await api.meusProjetos();

  // Pre-condicao do C06: existir projeto cadastrado pela Comissao de Extensao.
  if (projetos.length === 0) {
    conteudo.innerHTML = aviso(
      'Você não coordena nenhum projeto cadastrado. A Comissão de Extensão ' +
        'precisa cadastrar o projeto antes que vagas possam ser publicadas nele.',
      'info'
    );
    return;
  }

  conteudo.innerHTML = formularioDeVaga(projetos);

  const form = conteudo.querySelector('#formVaga');
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    publicarVaga(form);
  });
}

/** C06 - Publicar Vaga de Projeto */
async function publicarVaga(form) {
  const botao = form.querySelector('button[type="submit"]');
  const retorno = form.querySelector('#retornoPublicacao');
  const campos = new FormData(form);

  botao.disabled = true;
  botao.textContent = 'Publicando…';
  retorno.innerHTML = '';

  try {
    const vaga = await api.publicarVaga({
      projetoId: Number(campos.get('projetoId')),
      titulo: campos.get('titulo'),
      requisitos: campos.get('requisitos'),
      cargaHoraria: Number(campos.get('cargaHoraria')),
      turno: campos.get('turno'),
      modalidade: campos.get('modalidade'),
      semestreMinimo: Number(campos.get('semestreMinimo')),
      vagasTotais: Number(campos.get('vagasTotais')),
      dataEncerramento: campos.get('dataEncerramento')
    });

    // Pos-condicao do C06: a vaga ja esta no feed e aceita candidaturas.
    retorno.innerHTML =
      aviso(
        `Vaga "${vaga.titulo}" publicada com ${vaga.vagasTotais} ` +
          `${vaga.vagasTotais === 1 ? 'posição' : 'posições'}. ` +
          'Ela já aparece em Vagas abertas e está aceitando candidaturas.',
        'sucesso'
      ) + '<a class="botao botao--texto" href="#/vagas">Ver em Vagas abertas</a>';

    form.reset();
  } catch (erro) {
    retorno.innerHTML = aviso(erro.message, 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Publicar vaga';
  }
}
