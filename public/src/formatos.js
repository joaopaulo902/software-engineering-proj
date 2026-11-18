// Utilitarios de texto e data usados por todas as telas.

/**
 * Data de calendario (prazo da vaga, por exemplo). Lida em UTC de proposito:
 * "2026-11-30" tem que aparecer como 30/11 em qualquer fuso.
 */
export function dataBr(valor) {
  if (!valor) return '';
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Instante em que algo aconteceu (candidatura enviada, status alterado), no fuso do navegador. */
export function dataHoraBr(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  return (
    d.toLocaleDateString('pt-BR') +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Dia em que algo aconteceu, no fuso do navegador. */
export function diaBr(valor) {
  if (!valor) return '';
  return new Date(valor).toLocaleDateString('pt-BR');
}

/** Compara textos ignorando acento e caixa, como a busca do servidor (C01). */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Iniciais para o avatar: "Ana Souza" -> "AS". */
export function iniciais(nome) {
  const partes = String(nome ?? '')
    .replace(/^(profa?\.|dra?\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** ["A", "B", "C"] vira "A, B e C". */
export function listaEmPortugues(itens) {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}
