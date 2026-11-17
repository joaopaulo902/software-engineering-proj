/**
 * Regras de comparacao de texto usadas pelas buscas e filtros (C01, feed).
 * Ficam num lugar so para todas as telas buscarem do mesmo jeito.
 */

/** Minusculas e sem acento, para "extensao" achar "extensão". */
export function normalizar(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Termo vazio combina com tudo; senao, precisa aparecer em algum dos campos. */
export function combinaComTermo(termo: string | null | undefined, campos: (string | null)[]): boolean {
  const t = normalizar(termo);
  return !t || campos.some((campo) => normalizar(campo).includes(t));
}

/** Lista vazia combina com tudo; senao, o valor precisa ser um dos escolhidos. */
export function combinaComLista(valor: string, escolhidos: string[] | undefined): boolean {
  if (!escolhidos || escolhidos.length === 0) return true;
  const v = normalizar(valor);
  return escolhidos.some((e) => normalizar(e) === v);
}
