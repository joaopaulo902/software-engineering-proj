// A tabela de telas: para cada endereco, qual componente de `paginas/` mostrar.
// E o equivalente, no front, do `routes/index.ts` do servidor.
//
// COMO ENCAIXAR UMA TELA
//   1. Crie `paginas/MinhaTela.jsx` exportando o componente da tela:
//        export function MinhaTela({ usuario, params, consulta, definirTitulo, recarregar }) { ... }
//   2. Troque (ou acrescente) a linha da rota aqui embaixo, apontando
//      `pagina` para o seu arquivo e tirando o campo `dono`.
//   3. Se a tela aparece no menu lateral, confira a entrada dela em MENU.
//
// O arquivo da tela so e baixado quando alguem navega ate ela (lazy).

import { lazy } from 'react';

/** Carrega sob demanda o componente `nome` de um arquivo de `paginas/`. */
function tela(carregar, nome) {
  return lazy(() => carregar().then((modulo) => ({ default: modulo[nome] })));
}

const EmConstrucao = tela(() => import('./paginas/EmConstrucao.jsx'), 'EmConstrucao');

const TODOS = ['ESTUDANTE', 'COORDENADOR', 'ADMIN'];

/**
 * caminho  endereco depois do "#". ":id" casa com qualquer valor e chega em params.id.
 *          Rotas fixas ganham das que tem parametro ("/candidaturas/recebidas" antes de
 *          "/candidaturas/:id"), em qualquer ordem da tabela.
 * titulo   aparece no cabecalho.
 * papeis   quem pode abrir. O servidor confere de novo; isto so evita mostrar tela vazia.
 * menu     qual item do menu lateral fica marcado (padrao: o proprio caminho).
 * dono     so nas telas ainda nao encaixadas: quem vai fazer.
 */
export const ROTAS = [
  // ---------------------------------------------------------- frente C · vagas
  { caminho: '/vagas', titulo: 'Vagas abertas', papeis: TODOS,
    pagina: tela(() => import('./paginas/VagasAbertas.jsx'), 'VagasAbertas') },
  { caminho: '/vagas/nova', titulo: 'Ofertar nova vaga', papeis: ['COORDENADOR'],
    pagina: tela(() => import('./paginas/OfertarVaga.jsx'), 'OfertarVaga') },
  { caminho: '/vagas/:id', titulo: 'Detalhes da vaga', papeis: TODOS, menu: '/vagas',
    pagina: tela(() => import('./paginas/DetalhesDaVaga.jsx'), 'DetalhesDaVaga') },

  // ------------------------------------------------ dupla A · candidaturas
  { caminho: '/candidaturas', titulo: 'Minhas candidaturas', papeis: ['ESTUDANTE'],
    pagina: tela(() => import('./paginas/MinhasCandidaturas.jsx'), 'MinhasCandidaturas') },
  { caminho: '/candidaturas/:id', titulo: 'Minha candidatura', papeis: ['ESTUDANTE'],
    menu: '/candidaturas',
    pagina: tela(() => import('./paginas/MinhaCandidatura.jsx'), 'MinhaCandidatura') },
  { caminho: '/candidaturas/recebidas', titulo: 'Candidaturas recebidas', papeis: ['COORDENADOR'],
    pagina: tela(() => import('./paginas/CandidaturasRecebidas.jsx'), 'CandidaturasRecebidas') },
  { caminho: '/candidaturas/recebidas/:id', titulo: 'Candidatura', papeis: ['COORDENADOR'],
    menu: '/candidaturas/recebidas',
    pagina: tela(() => import('./paginas/CandidaturaRecebida.jsx'), 'CandidaturaRecebida') },

  // ---------------------------------------- dupla B · projetos, atividades e avisos
  { caminho: '/projetos', titulo: 'Projetos', papeis: TODOS,
    pagina: tela(() => import('./paginas/ListaDeProjetos.jsx'), 'ListaDeProjetos') },
  { caminho: '/projetos/:id', titulo: 'Página do projeto', papeis: TODOS, menu: '/projetos',
    pagina: tela(() => import('./paginas/DetalhesDoProjeto.jsx'), 'DetalhesDoProjeto') },
  { caminho: '/atividades', titulo: 'Feed de atividades', papeis: TODOS, menu: '/projetos',
    pagina: tela(() => import('./paginas/FeedDeAtividades.jsx'), 'FeedDeAtividades') },
  { caminho: '/meus-projetos', titulo: 'Meus projetos', papeis: ['ESTUDANTE', 'COORDENADOR'],
    pagina: tela(() => import('./paginas/MeusProjetos.jsx'), 'MeusProjetos') },
  { caminho: '/meus-projetos/incorporar', titulo: 'Incorporar projeto', papeis: ['COORDENADOR'],
    menu: '/meus-projetos',
    pagina: tela(() => import('./paginas/SolicitarIncorporacao.jsx'), 'SolicitarIncorporacao') },
  { caminho: '/incorporacoes', titulo: 'Solicitações de incorporação', papeis: ['ADMIN'],
    pagina: tela(() => import('./paginas/AvaliarIncorporacoes.jsx'), 'AvaliarIncorporacoes') },

  { caminho: '/notificacoes', titulo: 'Notificações', papeis: TODOS,
    pagina: tela(() => import('./paginas/Notificacoes.jsx'), 'Notificacoes') },

  // -------------------------------------- frente C · perfil e administracao
  { caminho: '/perfil', titulo: 'Perfil', papeis: TODOS,
    pagina: EmConstrucao, dono: 'frente C (C16)' },
  { caminho: '/usuarios/:id', titulo: 'Perfil', papeis: TODOS,
    pagina: EmConstrucao, dono: 'frente C (C16)' },
  { caminho: '/banlist', titulo: 'BanList', papeis: ['ADMIN'],
    pagina: EmConstrucao, dono: 'frente C (C12 e C19)' },
  { caminho: '/base-institucional', titulo: 'Base de dados', papeis: ['ADMIN'],
    pagina: EmConstrucao, dono: 'nível 3 (C09)' }
];

/**
 * O menu lateral de cada papel, na ordem dos prototipos.
 * `icone` e um nome de componentes/Icones.jsx.
 */
export const MENU = {
  ESTUDANTE: [
    { rotulo: 'Vagas abertas', caminho: '/vagas', icone: 'vagas' },
    { rotulo: 'Minhas candidaturas', caminho: '/candidaturas', icone: 'candidaturas' },
    { rotulo: 'Projetos', caminho: '/projetos', icone: 'projetos' },
    { rotulo: 'Meus projetos', caminho: '/meus-projetos', icone: 'equipe' },
    { rotulo: 'Notificações', caminho: '/notificacoes', icone: 'sino' }
  ],
  COORDENADOR: [
    { rotulo: 'Vagas abertas', caminho: '/vagas', icone: 'vagas' },
    { rotulo: 'Candidaturas recebidas', caminho: '/candidaturas/recebidas', icone: 'candidaturas' },
    { rotulo: 'Meus projetos', caminho: '/meus-projetos', icone: 'equipe' },
    { rotulo: 'Projetos', caminho: '/projetos', icone: 'projetos' },
    // Nos prototipos, "Ofertar nova vaga" abre a partir da Pagina do Projeto.
    // Fica no menu ate essa tela existir, para o C06 nao sumir do sistema.
    { rotulo: 'Ofertar nova vaga', caminho: '/vagas/nova', icone: 'mais' },
    { rotulo: 'Notificações', caminho: '/notificacoes', icone: 'sino' }
  ],
  ADMIN: [
    { rotulo: 'Vagas abertas', caminho: '/vagas', icone: 'vagas' },
    { rotulo: 'Projetos', caminho: '/projetos', icone: 'projetos' },
    { rotulo: 'Solicitações de incorporação', caminho: '/incorporacoes', icone: 'base' },
    { rotulo: 'BanList', caminho: '/banlist', icone: 'banlist' },
    { rotulo: 'Base de dados', caminho: '/base-institucional', icone: 'base' },
    { rotulo: 'Notificações', caminho: '/notificacoes', icone: 'sino' }
  ]
};

/** Para onde vai quem acabou de entrar. */
export const ROTA_INICIAL = '/vagas';
