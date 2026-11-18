// Um aviso da lista de notificacoes (dropdown do sino e tela Notificacoes).

import { dataHoraBr } from '../formatos';
import { navegar } from '../navegacao';

export function ItemDeNotificacao({ notificacao, aoAbrir }) {
  const texto = notificacao.texto || notificacao.mensagem || notificacao.conteudo ||
    `Aviso do tipo: ${notificacao.tipo || 'Geral'} (Ref: #${notificacao.referenciaId})`;
  const data = notificacao.criadaEm ? dataHoraBr(notificacao.criadaEm) : '';

  return (
    <button
      type="button"
      className={`notificacao ${notificacao.lida ? '' : 'notificacao--nao-lida'}`}
      onClick={() => aoAbrir(notificacao)}
    >
      <span className="etiqueta">{notificacao.tipo || 'Geral'}</span>
      <span>{texto}</span>
      {data && <small>{data}</small>}
    </button>
  );
}

/** Leva para a tela de que o aviso fala, pelo `referenciaId`. */
export function abrirNotificacao({ tipo, referenciaId }) {
  const referencia = Number(referenciaId);
  if (!Number.isInteger(referencia) || referencia <= 0) return;

  if (tipo === 'NOVA_ATIVIDADE') {
    navegar(`/projetos/${referencia}`);
  } else if (['NOVA_CANDIDATURA', 'CONFIRMACAO_DE_INGRESSO', 'DECLINIO_DE_INGRESSO'].includes(tipo)) {
    navegar(`/candidaturas/recebidas/${referencia}`);
  } else if (tipo === 'RESULTADO_DA_AVALIACAO') {
    navegar(`/candidaturas/${referencia}`);
  } else if (tipo === 'PEDIDO_DE_INCORPORACAO') {
    navegar('/incorporacoes');
  } else if (tipo === 'RESULTADO_DA_INCORPORACAO') {
    navegar('/meus-projetos');
  }
}
