/**
 * Leitura dos parametros que chegam na requisicao (query, corpo, rota).
 * So confere o FORMATO; o que eles significam para o negocio e o servico
 * que decide.
 */

/** Texto sem espacos nas pontas; vazio vira `undefined`. */
export function lerTexto(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();
  return texto.length ? texto : undefined;
}

/**
 * Lista vinda da query string. Aceita `?areas=Saude,Educacao` e tambem
 * `?areas=Saude&areas=Educacao`.
 */
export function lerLista(valor: unknown): string[] {
  const partes = Array.isArray(valor) ? valor : [valor];
  return partes
    .filter((p): p is string => typeof p === 'string')
    .flatMap((p) => p.split(','))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Id inteiro positivo (ex.: `:id` da rota); `null` se nao for. */
export function lerId(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}
