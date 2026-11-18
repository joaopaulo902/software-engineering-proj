// Quem esta usando o sistema. As telas perguntam aqui em vez de guardar uma copia.

import { api } from './servicos-api.js';

let usuario = null;

export function usuarioAtual() {
  return usuario;
}

/** Recupera a sessao que o servidor ainda guarda (quando a pagina e recarregada). */
export async function restaurarSessao() {
  try {
    usuario = await api.sessaoAtual();
  } catch {
    usuario = null;
  }
  return usuario;
}

export async function entrar(usuarioId) {
  usuario = await api.entrar(usuarioId);
  return usuario;
}

export async function sair() {
  await api.sair();
  usuario = null;
}

/** O servidor respondeu 401 no meio do uso: a sessao acabou. */
export function esquecerSessao() {
  usuario = null;
}
