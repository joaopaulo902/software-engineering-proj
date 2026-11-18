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
    <iframe class="iframe-projetos" src="${enderecoDaTela(rota, params, consulta)}"
            title="${rota.titulo}"></iframe>`;

  const iframe = conteudo.querySelector('.iframe-projetos');
  iframe.addEventListener('load', () => {
    const documento = iframe.contentDocument;
    if (!documento) return;

    const ajustarAltura = () => {
      const altura = Math.ceil(
        Math.max(documento.documentElement.scrollHeight, documento.body.scrollHeight, 520)
      );
      if (iframe.offsetHeight !== altura) iframe.style.height = `${altura}px`;
    };

    ajustarAltura();
    const observador = new ResizeObserver(ajustarAltura);
    observador.observe(documento.documentElement);
    observador.observe(documento.body);
  });
}
