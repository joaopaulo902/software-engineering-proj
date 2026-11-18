// Navegacao entre as telas pelo endereco depois do "#".
//
// Usar o endereco (e nao uma variavel) faz o botao Voltar do navegador
// funcionar e permite apontar direto para uma tela: a notificacao
// "candidatura aceita", por exemplo, e so um link para #/candidaturas/12.

import { ROTAS } from './rotas.js';

/** Vai para outra tela. Ex.: navegar('/candidaturas/12'). */
export function navegar(caminho) {
  const destino = '#' + caminho;
  if (location.hash === destino) {
    // Mesmo endereco: o navegador nao avisa, entao avisamos nos.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = destino;
  }
}

/** O endereco atual, separado em caminho e parametros de consulta. */
export function enderecoAtual() {
  const bruto = location.hash.replace(/^#/, '');
  const corte = bruto.indexOf('?');
  const caminho = (corte === -1 ? bruto : bruto.slice(0, corte)).replace(/\/+$/, '');
  const consulta = new URLSearchParams(corte === -1 ? '' : bruto.slice(corte + 1));
  return { caminho: caminho || '/', consulta };
}

/**
 * Acha a rota de um caminho e extrai os parametros (":id").
 * Entre duas rotas que casam, ganha a que tem menos parametros: assim
 * "/candidaturas/recebidas" nunca e lida como "/candidaturas/:id".
 */
export function acharRota(caminho, rotas = ROTAS) {
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

/** Chama `aoMudar` toda vez que o endereco muda. */
export function ouvirNavegacao(aoMudar) {
  window.addEventListener('hashchange', aoMudar);
}
