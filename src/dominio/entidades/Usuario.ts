export type Papel = 'ESTUDANTE' | 'COORDENADOR' | 'ADMIN';

/**
 * Usuario do sistema. A generalizacao do diagrama de casos de uso
 * (Usuario -> Estudante / Coordenador / Admin) e representada pelo campo
 * `papel`, e as perguntas sobre papel sao metodos desta classe em vez de
 * comparacoes de string espalhadas pelo codigo.
 */
export class Usuario {
  constructor(
    public readonly id: number,
    public readonly nome: string,
    public readonly email: string,
    public readonly papel: Papel,
    public readonly curso: string | null,
    public readonly semestre: number | null
  ) {}

  ehEstudante(): boolean {
    return this.papel === 'ESTUDANTE';
  }

  ehCoordenador(): boolean {
    return this.papel === 'COORDENADOR';
  }

  ehAdministrador(): boolean {
    return this.papel === 'ADMIN';
  }

  /** Semestre do estudante; 0 para quem nao e estudante. */
  semestreAtual(): number {
    return this.semestre ?? 0;
  }
}
