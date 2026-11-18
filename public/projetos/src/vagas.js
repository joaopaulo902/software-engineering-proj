// Frente C: o que as telas de vaga (C01, C03 e C06) compartilham.

/** Os mesmos valores que o servidor aceita (VagaController). */
export const TURNOS = ['Manhã', 'Tarde', 'Noite'];
export const MODALIDADES = ['Presencial', 'Remoto', 'Híbrido'];
export const BENEFICIOS = ['Horas de extensão', 'Bolsa'];

/** Ordenacoes do C01 (parametro `ordenarPor` de GET /api/vagas). */
export const ORDENACOES = [
  { valor: 'PRAZO', rotulo: 'Inscrições terminando antes' },
  { valor: 'PUBLICACAO', rotulo: 'Mais recentes' },
  { valor: 'CARGA_HORARIA', rotulo: 'Menor carga horária' }
];

/** Sugestoes para os campos de lista do formulario do C06. Pode digitar outras. */
export const AREAS_SUGERIDAS = [
  'Comunicação', 'Cultura', 'Dados', 'Educação', 'Meio Ambiente', 'Saúde', 'Tecnologia'
];
export const CURSOS_SUGERIDOS = [
  'Ciência da Computação', 'Engenharia da Computação', 'Estatística', 'Matemática'
];

/** Prazo da vaga: dia de calendario, lido em UTC para nao mudar de dia. */
export function dataBr(valor) {
  if (!valor) return '';
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** ["A", "B", "C"] vira "A, B e C". */
export function listaEmPortugues(itens) {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/**
 * Leva o APP PRINCIPAL para outra tela. Estas telas rodam dentro de um iframe;
 * mudar o endereco do app (e nao so do iframe) mantem o menu, o titulo e o
 * botao Voltar do navegador certos.
 */
export function irPara(caminho) {
  (window.top ?? window).location.hash = '#' + caminho;
}

/**
 * Sessao expirada (o servidor foi reiniciado, por exemplo): recarrega o app,
 * que volta para a tela de entrada. Devolve true quando foi esse o caso.
 */
export function tratarSessaoExpirada(falha) {
  if (falha?.status !== 401) return false;
  (window.top ?? window).location.reload();
  return true;
}
