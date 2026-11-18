// Liga as rotas do app principal as telas da aplicacao React de projetos.

function enderecoDaTela(rota, params) {
  switch (rota.caminho) {
    case '/projetos/:id':
      return `/projetos/dist/index.html?projeto=${encodeURIComponent(params.id)}`;
    case '/meus-projetos':
      return '/projetos/dist/index.html?aba=meus-projetos';
    case '/notificacoes':
      return '/projetos/dist/index.html?aba=projetos&notificacoes=1';
    default:
      return '/projetos/dist/index.html';
  }
}

export async function mostrar(conteudo, { rota, params }) {
  conteudo.innerHTML = `
    <iframe src="${enderecoDaTela(rota, params)}" title="${rota.titulo}"
            style="width: 100%; height: calc(100vh - 140px); min-height: 520px; border: 0;
                   border-radius: 12px; background: #fff;"></iframe>`;
}
