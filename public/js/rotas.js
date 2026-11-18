// Pacote `paginas` do subsistema Cliente Web.
//
// A tabela de telas: para cada endereco, qual arquivo de `paginas/` mostrar.
// E o equivalente, no front, do `routes/index.ts` do servidor.
//
// COMO ENCAIXAR UMA TELA
//   1. Crie `paginas/minha-tela.js` exportando
//        export async function mostrar(conteudo, contexto) { ... }
//      `conteudo` e o elemento onde a tela desenha. `contexto` traz
//      { usuario, params, consulta, definirTitulo, recarregar }.
//   2. Troque (ou acrescente) a linha da rota aqui embaixo, apontando
//      `pagina` para o seu arquivo e tirando o campo `dono`.
//   3. Se a tela aparece no menu lateral, confira a entrada dela em MENU.
//
// O arquivo da tela so e baixado quando alguem navega ate ela.

const emConstrucao = () => import('./paginas/em-construcao.js');

// As telas de projetos sao servidas por uma aplicacao React compilada em
// `public/projetos/dist`.
const telasDeProjetos = () => import('./paginas/aplicacao-projetos.js');

const TODOS = ['ESTUDANTE', 'COORDENADOR', 'ADMIN'];

/**
 * caminho  endereco depois do "#". ":id" casa com qualquer valor e chega em contexto.params.id.
 *          Rotas fixas ganham das que tem parametro ("/candidaturas/recebidas" antes de
 *          "/candidaturas/:id"), em qualquer ordem da tabela.
 * titulo   aparece no cabecalho.
 * papeis   quem pode abrir. O servidor confere de novo; isto so evita mostrar tela vazia.
 * menu     qual item do menu lateral fica marcado (padrao: o proprio caminho).
 * dono     so nas telas ainda nao encaixadas: quem vai fazer.
 */
export const ROTAS = [
  // ---------------------------------------------------------- frente C · vagas
  // As tres telas sao do app React (public/projetos/src/paginas: VagasAbertas,
  // OfertarVaga e DetalhesDaVaga), abertas por paginas/aplicacao-projetos.js.
  { caminho: '/vagas', titulo: 'Vagas abertas', papeis: TODOS,
    pagina: telasDeProjetos },
  { caminho: '/vagas/nova', titulo: 'Ofertar nova vaga', papeis: ['COORDENADOR'],
    menu: '/vagas/nova', pagina: telasDeProjetos },
  { caminho: '/vagas/:id', titulo: 'Detalhes da vaga', papeis: TODOS, menu: '/vagas',
    pagina: telasDeProjetos },

  // ------------------------------------------------ dupla A · candidaturas
  { caminho: '/candidaturas', titulo: 'Minhas candidaturas', papeis: ['ESTUDANTE'],
    pagina: () => import('./paginas/minhas-candidaturas.js') },
  { caminho: '/candidaturas/:id', titulo: 'Minha candidatura', papeis: ['ESTUDANTE'],
    menu: '/candidaturas',
    pagina: () => import('./paginas/minha-candidatura.js') },
  { caminho: '/candidaturas/recebidas', titulo: 'Candidaturas recebidas', papeis: ['COORDENADOR'],
    pagina: () => import('./paginas/candidaturas-recebidas.js') },
  { caminho: '/candidaturas/recebidas/:id', titulo: 'Candidatura', papeis: ['COORDENADOR'],
    menu: '/candidaturas/recebidas',
    pagina: () => import('./paginas/candidatura-recebida.js') },

  // ---------------------------------------- projetos, atividades e avisos
  { caminho: '/projetos', titulo: 'Projetos', papeis: TODOS,
    pagina: telasDeProjetos },
  { caminho: '/projetos/:id', titulo: 'Página do projeto', papeis: TODOS, menu: '/projetos',
    pagina: telasDeProjetos },
  { caminho: '/meus-projetos', titulo: 'Meus projetos', papeis: ['ESTUDANTE', 'COORDENADOR'],
    pagina: telasDeProjetos },
  { caminho: '/incorporacoes', titulo: 'Solicitações de incorporação', papeis: ['ADMIN'],
    pagina: telasDeProjetos },

  // -------------------------------------- frente C · perfil e administracao
  { caminho: '/perfil', titulo: 'Perfil', papeis: TODOS,
    pagina: emConstrucao, dono: 'frente C (C16)' },
  { caminho: '/usuarios/:id', titulo: 'Perfil', papeis: TODOS,
    pagina: emConstrucao, dono: 'frente C (C16)' },
  { caminho: '/banlist', titulo: 'BanList', papeis: ['ADMIN'],
    pagina: emConstrucao, dono: 'frente C (C12 e C19)' },
  { caminho: '/base-institucional', titulo: 'Base de dados', papeis: ['ADMIN'],
    pagina: emConstrucao, dono: 'nível 3 (C09)' }
];

/**
 * O menu lateral de cada papel, na ordem dos prototipos.
 * `icone` e um nome de `ICONES` em componentes/estrutura.js.
 */
export const MENU = {
  ESTUDANTE: [
    { rotulo: 'Vagas abertas', caminho: '/vagas', icone: 'vagas' },
    { rotulo: 'Minhas candidaturas', caminho: '/candidaturas', icone: 'candidaturas' },
    { rotulo: 'Projetos', caminho: '/projetos', icone: 'projetos' },
    { rotulo: 'Meus projetos', caminho: '/meus-projetos', icone: 'equipe' }
  ],
  COORDENADOR: [
    { rotulo: 'Vagas abertas', caminho: '/vagas', icone: 'vagas' },
    { rotulo: 'Candidaturas recebidas', caminho: '/candidaturas/recebidas', icone: 'candidaturas' },
    { rotulo: 'Meus projetos', caminho: '/meus-projetos', icone: 'equipe' },
    { rotulo: 'Projetos', caminho: '/projetos', icone: 'projetos' },
    // Nos prototipos, "Ofertar nova vaga" abre a partir da Pagina do Projeto.
    // Fica no menu ate essa tela existir, para o C06 nao sumir do sistema.
    { rotulo: 'Ofertar nova vaga', caminho: '/vagas/nova', icone: 'mais' }
  ],
  ADMIN: [
    { rotulo: 'Vagas abertas', caminho: '/vagas', icone: 'vagas' },
    { rotulo: 'Projetos', caminho: '/projetos', icone: 'projetos' },
    { rotulo: 'Solicitações de incorporação', caminho: '/incorporacoes', icone: 'base' },
    { rotulo: 'BanList', caminho: '/banlist', icone: 'banlist' },
    { rotulo: 'Base de dados', caminho: '/base-institucional', icone: 'base' }
  ]
};

/** Para onde vai quem acabou de entrar. */
export const ROTA_INICIAL = '/vagas';
