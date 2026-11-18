// PROVISORIO: liga o menu do app as telas da dupla B, que ainda estao na pagina
// separada `front_B.html`. Esta tela so abre aquela pagina dentro da area de
// conteudo, ja na aba certa.
//
// Quando as telas da dupla B virarem arquivos proprios em `paginas/`, apague
// este arquivo e aponte as rotas de `rotas.js` para eles.

/** Qual parte da pagina da dupla B cada rota do app abre. */
function enderecoDaTela(rota, params) {
  switch (rota.caminho) {
    case '/projetos/:id':
      return `/front_B.html?projeto=${encodeURIComponent(params.id)}`;
    case '/meus-projetos':
      return '/front_B.html?aba=meus-projetos';
    case '/notificacoes':
      return '/front_B.html?notificacoes=1';
    default:
      return '/front_B.html';
  }
}

export async function mostrar(conteudo, { rota, params }) {
  conteudo.innerHTML = `
    <iframe src="${enderecoDaTela(rota, params)}" title="${rota.titulo}"
            style="width: 100%; height: calc(100vh - 140px); min-height: 520px; border: 0;
                   border-radius: 12px; background: #fff;"></iframe>`;
}
