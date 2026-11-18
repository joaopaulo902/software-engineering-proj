import { escapar, dataHoraBr } from './base.js';

export function renderizarNotificacao(notificacao) {
  const texto = notificacao.texto || notificacao.mensagem || notificacao.conteudo ||
    `Aviso do tipo: ${notificacao.tipo || 'Geral'} (Ref: #${notificacao.referenciaId})`;
  const data = notificacao.criadaEm ? dataHoraBr(notificacao.criadaEm) : '';

  return `
    <button type="button"
            class="notificacao ${notificacao.lida ? '' : 'notificacao--nao-lida'}"
            data-notificacao data-tipo="${escapar(notificacao.tipo)}"
            data-referencia="${escapar(notificacao.referenciaId)}">
      <span class="etiqueta">${escapar(notificacao.tipo || 'Geral')}</span>
      <span>${escapar(texto)}</span>
      ${data ? `<small>${escapar(data)}</small>` : ''}
    </button>`;
}

export function abrirNotificacao({ tipo, referenciaId }) {
  const referencia = Number(referenciaId);
  if (!Number.isInteger(referencia) || referencia <= 0) return;

  if (tipo === 'NOVA_ATIVIDADE') {
    location.hash = `#/projetos/${referencia}`;
  } else if (['NOVA_CANDIDATURA', 'CONFIRMACAO_DE_INGRESSO', 'DECLINIO_DE_INGRESSO'].includes(tipo)) {
    location.hash = `#/candidaturas/recebidas/${referencia}`;
  } else if (tipo === 'RESULTADO_DA_AVALIACAO') {
    location.hash = `#/candidaturas/${referencia}`;
  } else if (tipo === 'PEDIDO_DE_INCORPORACAO') {
    location.hash = '#/incorporacoes';
  } else if (tipo === 'RESULTADO_DA_INCORPORACAO') {
    location.hash = '#/meus-projetos';
  }
}
