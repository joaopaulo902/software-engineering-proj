export type Papel = 'ESTUDANTE' | 'COORDENADOR' | 'ADMIN';

/**
 * O que a pessoa conta sobre si no perfil (C16). Os links sao enderecos
 * http(s) completos, ou null quando a pessoa nao informou.
 */
export interface PerfilDoUsuario {
  descricao: string;
  contato: string;
  lattes: string | null;
  linkedin: string | null;
  github: string | null;
  paginaPessoal: string | null;
}

export const PERFIL_VAZIO: PerfilDoUsuario = {
  descricao: '',
  contato: '',
  lattes: null,
  linkedin: null,
  github: null,
  paginaPessoal: null
};

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
    public readonly semestre: number | null,
    public readonly perfil: PerfilDoUsuario = PERFIL_VAZIO
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

  /**
   * Quem pode ver o e-mail desta pessoa no perfil. O e-mail de coordenadores
   * e da administracao e institucional e aparece para todos; o do estudante
   * so para ele mesmo, para coordenadores (que avaliam candidaturas) e para
   * a administracao.
   */
  emailVisivelPara(visitante: Usuario): boolean {
    if (!this.ehEstudante()) return true;
    return visitante.id === this.id || visitante.ehCoordenador() || visitante.ehAdministrador();
  }
}
