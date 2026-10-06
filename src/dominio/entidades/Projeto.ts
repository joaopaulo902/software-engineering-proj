import { Usuario } from './Usuario';

/**
 * Projeto de extensao cadastrado pela Comissao de Extensao.
 *
 * Existir nesta tabela e a pre-condicao do C06: so se publica vaga em
 * projeto que a Comissao ja cadastrou e homologou.
 */
export class Projeto {
  constructor(
    public readonly id: number,
    public readonly nome: string,
    public readonly descricao: string,
    public readonly area: string,
    public readonly coordenadorId: number
  ) {}

  /** So quem coordena o projeto pode publicar vagas nele. */
  ehCoordenadoPor(usuario: Usuario): boolean {
    return this.coordenadorId === usuario.id;
  }
}
