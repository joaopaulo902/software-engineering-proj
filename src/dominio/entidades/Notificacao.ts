export type TipoNotificacao =
  | 'NOVA_CANDIDATURA'
  | 'RESULTADO_DA_AVALIACAO'
  | 'CONFIRMACAO_DE_INGRESSO'
  | 'DECLINIO_DE_INGRESSO'
  | 'NOVA_ATIVIDADE'
  | 'AVALIACAO_RECEBIDA'
  | 'NOVA_DENUNCIA'
  | 'PEDIDO_DE_INCORPORACAO'
  | 'RESULTADO_DA_INCORPORACAO'
  | 'FIM_DE_PARTICIPACAO'
  | 'ATUALIZACAO_DE_DENUNCIA';

export const TIPOS_DE_NOTIFICACAO: readonly TipoNotificacao[] = [
  'NOVA_CANDIDATURA',
  'RESULTADO_DA_AVALIACAO',
  'CONFIRMACAO_DE_INGRESSO',
  'DECLINIO_DE_INGRESSO',
  'NOVA_ATIVIDADE',
  'AVALIACAO_RECEBIDA',
  'NOVA_DENUNCIA',
  'PEDIDO_DE_INCORPORACAO',
  'RESULTADO_DA_INCORPORACAO',
  'FIM_DE_PARTICIPACAO',
  'ATUALIZACAO_DE_DENUNCIA'
];

/** O que o NotificadorInApp grava para cada destinatario. */
export interface NovaNotificacao {
  destinatarioId: number;
  tipo: TipoNotificacao;
  texto: string;
  referenciaId: number | null;
}

/** Aviso in-app que aparece na tela de Notificacoes e no contador do sino. */
export class Notificacao {
  constructor(
    public readonly id: number,
    public readonly destinatarioId: number,
    public readonly tipo: TipoNotificacao,
    public readonly texto: string,
    /** Id do que o aviso fala (candidatura, projeto...), para abrir a tela certa. */
    public readonly referenciaId: number | null,
    public readonly lida: boolean,
    public readonly criadaEm: Date
  ) {}
}
