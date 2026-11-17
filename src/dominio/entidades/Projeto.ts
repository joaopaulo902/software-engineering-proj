import { Usuario } from './Usuario';

export type SituacaoProjeto = 'ATIVO' | 'INATIVO';

/**
 * Projeto de extensao cadastrado pela Comissao de Extensao.
 *
 * Existir nesta tabela e a pre-condicao do C06: so se publica vaga em
 * projeto que a Comissao ja cadastrou e homologou. O projeto vem da base
 * institucional com o nome do coordenador cadastrado; o `coordenadorId`
 * so e preenchido quando um coordenador do sistema o incorpora (C17).
 */
export class Projeto {
  constructor(
    public readonly id: number,
    public readonly nome: string,
    public readonly descricao: string,
    public readonly area: string,
    public readonly icone: string | null,
    public readonly situacao: SituacaoProjeto,
    public readonly coordenadorCadastrado: string,
    public readonly coordenadorId: number | null
  ) {}

  /** Quem coordena o projeto pode publicar vagas, postar e gerir a equipe. */
  ehCoordenadoPor(usuario: Pick<Usuario, 'id'>): boolean {
    return this.coordenadorId !== null && this.coordenadorId === usuario.id;
  }

  /** Algum coordenador do sistema ja assumiu o projeto (C17). */
  estaIncorporado(): boolean {
    return this.coordenadorId !== null;
  }

  /** Projeto ativo e com coordenador no sistema: pode receber vagas. */
  aceitaVagas(): boolean {
    return this.situacao === 'ATIVO' && this.estaIncorporado();
  }
}
