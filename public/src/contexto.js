// O que todas as telas compartilham, sem precisar receber por props:
// quem esta logado, a mensagem rapida e o contador do sino.

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

export const ContextoDaAplicacao = createContext(null);

/**
 * {
 *   usuario,                       quem esta logado
 *   mensagemRapida(texto, tipo?),  retorno curto no topo ("Ingresso confirmado.");
 *                                  pode ser chamada logo antes de navegar(...) ou
 *                                  recarregar(): aparece na tela seguinte
 *   definirContadorDoSino(n)       numero no sino do cabecalho; 0 esconde
 *   atualizarUsuario(usuario)      troca os dados de quem esta logado depois de
 *                                  editar o perfil (o cabecalho mostra o semestre)
 * }
 */
export function useAplicacao() {
  return useContext(ContextoDaAplicacao);
}

/**
 * Carrega dados para uma tela: { carregando, dados, erro }.
 *
 * `carregar` e uma funcao async (normalmente uma chamada da api). Se ela
 * falhar, `erro` traz a falha e a tela mostra a mensagem no lugar do conteudo.
 * Uma resposta que chega depois de a tela sair e descartada.
 */
export function useDados(carregar, dependencias = []) {
  const [estado, setEstado] = useState({ carregando: true, dados: null, erro: null });

  useEffect(() => {
    let ativa = true;
    setEstado({ carregando: true, dados: null, erro: null });
    carregar().then(
      (dados) => ativa && setEstado({ carregando: false, dados, erro: null }),
      (erro) => ativa && setEstado({ carregando: false, dados: null, erro })
    );
    return () => {
      ativa = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return estado;
}

// O pacote servicos-api avisa por este evento quando respondeu com dados de
// exemplo. Ele nao conhece a tela; quem decide como mostrar e a estrutura.
let exemploEmUso = false;
const ouvintesDoExemplo = new Set();
window.addEventListener('connext:dados-de-exemplo', () => {
  exemploEmUso = true;
  ouvintesDoExemplo.forEach((ouvinte) => ouvinte());
});

/** A faixa "Dados de exemplo" deve aparecer? */
export function useExemploEmUso() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintesDoExemplo.add(ouvinte);
      return () => ouvintesDoExemplo.delete(ouvinte);
    },
    () => exemploEmUso
  );
}
