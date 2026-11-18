// Liga as rotas do app principal as telas da aplicacao React de projetos.

function enderecoDaTela(rota, params, consulta) {
  switch (rota.caminho) {
    // frente C: vagas
    case '/vagas':
      return '/projetos/dist/index.html?aba=vagas';
    case '/vagas/nova': {
      // "+ Ofertar nova vaga" da Pagina do Projeto pode mandar ?projeto=<id>
      const projeto = Number(consulta?.get('projeto'));
      return '/projetos/dist/index.html?aba=ofertar-vaga' + (projeto > 0 ? `&projetoDaVaga=${projeto}` : '');
    }
    case '/vagas/:id':
      return `/projetos/dist/index.html?vaga=${encodeURIComponent(params.id)}`;
    case '/projetos/:id':
      return `/projetos/dist/index.html?projeto=${encodeURIComponent(params.id)}`;
    case '/meus-projetos':
      return '/projetos/dist/index.html?aba=meus-projetos';
    case '/incorporacoes':
      return '/projetos/dist/index.html?aba=avaliar-incorporacoes';
    default:
      return '/projetos/dist/index.html';
  }
}

export async function mostrar(conteudo, { rota, params, consulta }) {
  conteudo.innerHTML = `
    <iframe src="${enderecoDaTela(rota, params, consulta)}" title="${rota.titulo}"
            style="width: 100%; height: calc(100vh - 140px); min-height: 520px; border: 0;
                   border-radius: 12px; background: #fff;"></iframe>`;
}
