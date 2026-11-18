// Navegacao entre as telas pelo endereco depois do "#".
//
// Usar o endereco (e nao uma variavel) faz o botao Voltar do navegador
// funcionar e permite apontar direto para uma tela: a notificacao
// "candidatura aceita", por exemplo, e so um link para #/candidaturas/12.

import { useMemo, useSyncExternalStore } from 'react';

// `versao` muda a cada troca de tela e a cada `recarregar()`. A aplicacao usa
// a versao como `key` da tela: cada visita monta a tela do zero, como uma
// pagina nova, e uma resposta lenta da tela anterior nao atropela a atual.
let versao = 0;
const ouvintes = new Set();

function avisar() {
  versao++;
  ouvintes.forEach((ouvinte) => ouvinte());
}

window.addEventListener('hashchange', avisar);

/** Vai para outra tela. Ex.: navegar('/candidaturas/12'). */
export function navegar(caminho) {
  const destino = '#' + caminho;
  // Mesmo endereco: o navegador nao avisa, entao avisamos nos.
  if (location.hash === destino) avisar();
  else location.hash = destino;
}

/** Desenha a tela atual de novo, do zero (depois de uma acao, por exemplo). */
export function recarregarTela() {
  avisar();
}

/** Tira o "#/..." do endereco sem criar uma entrada no historico (ao sair). */
export function limparEndereco() {
  history.replaceState(null, '', location.pathname + location.search);
  avisar();
}

/** O endereco atual, separado em caminho e parametros de consulta. */
export function lerEndereco(hash = location.hash) {
  const bruto = hash.replace(/^#/, '');
  const corte = bruto.indexOf('?');
  const caminho = (corte === -1 ? bruto : bruto.slice(0, corte)).replace(/\/+$/, '');
  const consulta = new URLSearchParams(corte === -1 ? '' : bruto.slice(corte + 1));
  return { caminho: caminho || '/', consulta };
}

function inscrever(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function fotografia() {
  return `${versao}|${location.hash}`;
}

/** Hook: { caminho, consulta, versao } do endereco atual, atualizado a cada troca. */
export function useEndereco() {
  const atual = useSyncExternalStore(inscrever, fotografia);
  return useMemo(() => {
    const corte = atual.indexOf('|');
    return { ...lerEndereco(atual.slice(corte + 1)), versao: Number(atual.slice(0, corte)) };
  }, [atual]);
}

/**
 * Acha a rota de um caminho e extrai os parametros (":id").
 * Entre duas rotas que casam, ganha a que tem menos parametros: assim
 * "/candidaturas/recebidas" nunca e lida como "/candidaturas/:id".
 */
export function acharRota(caminho, rotas) {
  const partes = caminho.split('/').filter(Boolean);
  let melhor = null;

  for (const rota of rotas) {
    const molde = rota.caminho.split('/').filter(Boolean);
    if (molde.length !== partes.length) continue;

    const params = {};
    const casou = molde.every((trecho, i) => {
      if (trecho.startsWith(':')) {
        params[trecho.slice(1)] = decodeURIComponent(partes[i]);
        return true;
      }
      return trecho === partes[i];
    });
    if (!casou) continue;

    const quantos = Object.keys(params).length;
    if (!melhor || quantos < melhor.quantos) melhor = { rota, params, quantos };
  }

  return melhor && { rota: melhor.rota, params: melhor.params };
}
