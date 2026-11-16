/** O que o autor informa ao postar uma atividade (C10). */
export interface DadosAtividade {
  titulo: string;
  descricao: string;
  /** Endereco da foto; o envio do arquivo em si e uma simplificacao declarada. */
  foto: string | null;
}

/** Postagem sobre algo que aconteceu no projeto (C10). */
export class Atividade {
  constructor(
    public readonly id: number,
    public readonly projetoId: number,
    public readonly autorId: number,
    public readonly titulo: string,
    public readonly descricao: string,
    public readonly fotoUrl: string | null,
    public readonly publicadaEm: Date
  ) {}
}
