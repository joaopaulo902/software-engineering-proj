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
