/**
 * Datas de calendario (dia, sem hora) como prazos de inscricao.
 *
 * CONVENCAO DO SISTEMA: um dia de calendario e representado por um `Date`
 * na meia-noite UTC daquele dia. "30/11/2026" e sempre 2026-11-30T00:00:00Z.
 *
 * Sem uma convencao unica, o mesmo dia vira instantes diferentes conforme
 * quem o produziu: o PGlite devolve meia-noite UTC, o driver `pg` devolve
 * meia-noite local, e no fuso do Brasil essas duas "meias-noites" caem em
 * dias diferentes. Comparar prazos assim faz uma vaga que encerra HOJE
 * parecer encerrada desde ontem.
 */

/** Hoje, pelo relogio local do servidor, na convencao acima. */
export function hojeComoDia(agora: Date = new Date()): Date {
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}

/** Converte "AAAA-MM-DD" em dia de calendario; `null` se a data nao existir. */
export function lerDia(texto: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return null;

  const [ano, mes, dia] = partes.slice(1).map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  // Date.UTC aceita 2026-02-30 e devolve 02/03. Se o dia "andou", nao existia.
  const existe =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return existe ? data : null;
}

/** Dia de calendario no formato "AAAA-MM-DD", o que o tipo DATE do banco espera. */
export function formatarDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}
