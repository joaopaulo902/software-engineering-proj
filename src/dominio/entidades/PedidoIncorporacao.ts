import { RegraDeNegocio } from '../erros';

export type StatusPedidoIncorporacao = 'PENDENTE' | 'DEFERIDO' | 'INDEFERIDO';

export class PedidoIncorporacao {
  constructor(
    public readonly id: number,
    public readonly projetoId: number,
    public readonly coordenadorId: number,
    public readonly mensagem: string | null,
    public status: StatusPedidoIncorporacao,
    public readonly solicitadoEm: Date,
    public avaliadoEm: Date | null
  ) {}

  deferir(avaliadoEm: Date): void {
    this.validarPendente();
    this.status = 'DEFERIDO';
    this.avaliadoEm = avaliadoEm;
  }

  indeferir(avaliadoEm: Date): void {
    this.validarPendente();
    this.status = 'INDEFERIDO';
    this.avaliadoEm = avaliadoEm;
  }

  private validarPendente(): void {
    if (this.status !== 'PENDENTE') {
      throw new RegraDeNegocio('Este pedido de incorporação já foi avaliado.');
    }
  }
}
