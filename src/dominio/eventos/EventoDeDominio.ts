/**
 * O que aconteceu no dominio e merece aviso.
 *
 * Cada servico publica o evento do seu caso de uso; quem decide quem fica
 * sabendo, e como, sao os observadores (padrao Observer). O servico nao
 * conhece notificacao, e-mail nem destinatario.
 */
export type TipoEvento =
  | 'CANDIDATURA_CRIADA' //     C04  origemId = candidatura
  | 'CANDIDATURA_AVALIADA' //   C11  origemId = candidatura
  | 'INGRESSO_CONFIRMADO' //    C07  origemId = candidatura
  | 'INGRESSO_DECLINADO' //     C07  origemId = candidatura
  | 'ATIVIDADE_POSTADA' //      C10  origemId = atividade
  | 'AVALIACAO_REGISTRADA' //   C08  origemId = avaliacao
  | 'DENUNCIA_REGISTRADA' //    C13  origemId = denuncia
  | 'INCORPORACAO_SOLICITADA' // C17 origemId = pedido de incorporacao
  | 'INCORPORACAO_AVALIADA' //  C17  origemId = pedido de incorporacao
  | 'PARTICIPACAO_ENCERRADA' // C08  origemId = participacao
  | 'DENUNCIA_JULGADA'; //      C13  origemId = denuncia

export interface EventoDeDominio {
  tipo: TipoEvento;
  /** Id da entidade que o evento descreve (ver a tabela acima). */
  origemId: number;
  /** Quem causou o evento; vazio quando foi o agendador. Nunca e avisado do proprio ato. */
  autorId: number | null;
  ocorridoEm: Date;
}

/** Atalho para montar o evento com a hora atual. */
export function evento(
  tipo: TipoEvento,
  origemId: number,
  autorId: number | null,
  ocorridoEm: Date = new Date()
): EventoDeDominio {
  return { tipo, origemId, autorId, ocorridoEm };
}
