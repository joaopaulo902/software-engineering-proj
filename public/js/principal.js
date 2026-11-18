// Ponto de partida do Cliente Web. Faz so tres coisas: descobre quem esta
// logado, monta a estrutura comum e entrega cada endereco a tela dele.
// O conteudo das telas fica em `paginas/`, um arquivo por tela.

import { MENU, ROTA_INICIAL } from './rotas.js';
import { navegar, enderecoAtual, acharRota, ouvirNavegacao } from './navegacao.js';
import { usuarioAtual, restaurarSessao, sair, esquecerSessao } from './sessao.js';
import {
  montarEstrutura,
  prepararTela,
  definirTitulo,
  definirContadorDoSino
} from './componentes/estrutura.js';
import { api } from './servicos-api.js';
import { aviso, carregando } from './componentes/base.js';
import { mostrarEntrada } from './paginas/entrada.js';

const app = document.getElementById('app');
let estruturaDe = null; // id do usuario para quem a estrutura esta montada

function telaDeEntrada() {
  estruturaDe = null;
  document.title = 'Connext — Extensão INF';
  mostrarEntrada(app, {
    aoEntrar: () => {
      if (enderecoAtual().caminho === '/') navegar(ROTA_INICIAL);
      else mostrarTela();
    }
  });
}

async function mostrarTela() {
  const usuario = usuarioAtual();
  if (!usuario) {
    telaDeEntrada();
    return;
  }

  const { caminho, consulta } = enderecoAtual();
  if (caminho === '/') {
    navegar(ROTA_INICIAL);
    return;
  }

  if (estruturaDe !== usuario.id) {
    montarEstrutura(app, {
      usuario,
      itens: MENU[usuario.papel] ?? [],
      aoSair: async () => {
        await sair();
        history.replaceState(null, '', location.pathname);
        telaDeEntrada();
      }
    });
    estruturaDe = usuario.id;
  }

  atualizarSino();

  const achada = acharRota(caminho);

  if (!achada) {
    const conteudo = prepararTela({ titulo: 'Tela não encontrada', itemDoMenu: null });
    conteudo.innerHTML = aviso('Este endereço não leva a nenhuma tela. Use o menu ao lado.', 'info');
    return;
  }

  const { rota, params } = achada;
  const conteudo = prepararTela({ titulo: rota.titulo, itemDoMenu: rota.menu ?? rota.caminho });

  if (rota.papeis && !rota.papeis.includes(usuario.papel)) {
    conteudo.innerHTML = aviso('Esta tela não está disponível para o seu perfil.', 'info');
    return;
  }

  conteudo.innerHTML = carregando();

  try {
    const pagina = await rota.pagina();
    await pagina.mostrar(conteudo, {
      usuario,
      params,
      consulta,
      rota,
      definirTitulo: (titulo) => {
        // So vale enquanto esta tela ainda e a que esta na pagina.
        if (conteudo.isConnected) definirTitulo(titulo);
      },
      recarregar: mostrarTela
    });
  } catch (erro) {
    if (erro.status === 401) {
      // A sessao expirou no servidor (ele foi reiniciado, por exemplo).
      esquecerSessao();
      telaDeEntrada();
      return;
    }
    conteudo.innerHTML = aviso(erro.message || 'Não foi possível abrir esta tela.', 'erro');
  }
}

/**
 * O contador do sino e atualizado a cada troca de tela. Falha aqui nao
 * atrapalha a tela: o sino so fica como estava.
 */
async function atualizarSino() {
  try {
    definirContadorDoSino(await api.notificacoesNaoLidas());
  } catch {
    // Sem rota ou sem sessao: o contador continua como estava.
  }
}

(async function iniciar() {
  await restaurarSessao();
  ouvirNavegacao(mostrarTela);
  await mostrarTela();
})();
