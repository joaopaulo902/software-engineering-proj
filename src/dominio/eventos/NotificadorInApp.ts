import { EventoDeDominio, TipoEvento } from './EventoDeDominio';
import { ObservadorDeEventos } from './ObservadorDeEventos';
import { TipoNotificacao } from '../entidades/Notificacao';
import { INotificacaoRepository } from '../../persistencia/interfaces/INotificacaoRepository';
import { IProjetoRepository } from '../../persistencia/interfaces/IProjetoRepository';
import { IParticipacaoRepository } from '../../persistencia/interfaces/IParticipacaoRepository';
import { IAtividadeRepository } from '../../persistencia/interfaces/IAtividadeRepository';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';
import { IPedidoIncorporacaoRepository } from '../../persistencia/interfaces/IPedidoIncorporacaoRepository';

/** Que tipo de aviso cada evento gera. */
const TIPO_DO_AVISO: Record<TipoEvento, TipoNotificacao> = {
  CANDIDATURA_CRIADA: 'NOVA_CANDIDATURA',
  CANDIDATURA_AVALIADA: 'RESULTADO_DA_AVALIACAO',
  INGRESSO_CONFIRMADO: 'CONFIRMACAO_DE_INGRESSO',
  INGRESSO_DECLINADO: 'DECLINIO_DE_INGRESSO',
  ATIVIDADE_POSTADA: 'NOVA_ATIVIDADE',
  AVALIACAO_REGISTRADA: 'AVALIACAO_RECEBIDA',
  DENUNCIA_REGISTRADA: 'NOVA_DENUNCIA',
  INCORPORACAO_SOLICITADA: 'PEDIDO_DE_INCORPORACAO',
  INCORPORACAO_AVALIADA: 'RESULTADO_DA_INCORPORACAO',
  PARTICIPACAO_ENCERRADA: 'FIM_DE_PARTICIPACAO',
  DENUNCIA_JULGADA: 'ATUALIZACAO_DE_DENUNCIA'
};

/** Para quem vai o aviso, o que ele diz e para onde o clique leva. */
interface Aviso {
  destinatarios: number[];
  texto: string;
  referenciaId: number | null;
}

/**
 * Observador concreto: transforma cada evento do dominio em avisos in-app,
 * um por destinatario, que aparecem no sino.
 *
 * E o unico lugar que sabe QUEM deve ser avisado de cada caso de uso. Os
 * servicos so dizem O QUE aconteceu. O autor do evento nunca e avisado do
 * proprio ato.
 */
export class NotificadorInApp implements ObservadorDeEventos {
  constructor(
    private readonly notificacoes: INotificacaoRepository,
    private readonly projetos: IProjetoRepository,
    private readonly participacoes: IParticipacaoRepository,
    private readonly atividades: IAtividadeRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly pedidos: IPedidoIncorporacaoRepository
  ) {}

  async notificar(evento: EventoDeDominio): Promise<void> {
    const aviso = await this.montarAviso(evento);
    if (!aviso) return;

    const destinatarios = [...new Set(aviso.destinatarios)].filter((id) => id !== evento.autorId);
    for (const destinatarioId of destinatarios) {
      await this.notificacoes.inserir({
        destinatarioId,
        tipo: TIPO_DO_AVISO[evento.tipo],
        texto: aviso.texto,
        referenciaId: aviso.referenciaId
      });
    }
  }

  private async montarAviso(evento: EventoDeDominio): Promise<Aviso | null> {
    switch (evento.tipo) {
      case 'CANDIDATURA_CRIADA':
      case 'CANDIDATURA_AVALIADA':
      case 'INGRESSO_CONFIRMADO':
      case 'INGRESSO_DECLINADO':
        return this.avisoDeCandidatura(evento);

      case 'ATIVIDADE_POSTADA':
        return this.avisoDeAtividade(evento);

      case 'PARTICIPACAO_ENCERRADA':
        return this.avisoDeFimDeParticipacao(evento);

      // C13 e C17: os pedidos chegam a todos os administradores.
      case 'DENUNCIA_REGISTRADA':
        return {
          destinatarios: await this.administradores(),
          texto: 'Nova denúncia registrada aguardando análise.',
          referenciaId: evento.origemId
        };
      case 'INCORPORACAO_SOLICITADA':
        return {
          destinatarios: await this.administradores(),
          texto: 'Novo pedido de incorporação de projeto aguardando avaliação.',
          referenciaId: evento.origemId
        };

      case 'AVALIACAO_REGISTRADA':
      case 'DENUNCIA_JULGADA':
        return null;
      case 'INCORPORACAO_AVALIADA':
        return this.avisoDeIncorporacao(evento);
    }
  }

  /** C04, C07 e C11: o coordenador ou o estudante da candidatura. */
  private async avisoDeCandidatura(evento: EventoDeDominio): Promise<Aviso | null> {
    const ctx = await this.projetos.buscarContextoDaCandidatura(evento.origemId);
    if (!ctx) return null;

    const vaga = `"${ctx.vagaTitulo}"`;
    const coordenador = ctx.projeto.coordenadorId === null ? [] : [ctx.projeto.coordenadorId];

    switch (evento.tipo) {
      case 'CANDIDATURA_CRIADA':
        return {
          destinatarios: coordenador,
          texto: `${ctx.estudanteNome} se candidatou à vaga ${vaga} do projeto ${ctx.projeto.nome}.`,
          referenciaId: ctx.candidaturaId
        };
      case 'CANDIDATURA_AVALIADA':
        return {
          destinatarios: [ctx.estudanteId],
          texto:
            ctx.status === 'ACEITA'
              ? `Sua candidatura à vaga ${vaga} foi aceita. Confirme ou decline o ingresso no projeto ${ctx.projeto.nome}.`
              : ctx.status === 'RECUSADA'
                ? `Sua candidatura à vaga ${vaga} do projeto ${ctx.projeto.nome} não foi aceita.`
                : `O status da sua candidatura à vaga ${vaga} foi atualizado.`,
          referenciaId: ctx.candidaturaId
        };
      case 'INGRESSO_CONFIRMADO':
        return {
          destinatarios: coordenador,
          texto:
            `${ctx.estudanteNome} confirmou o ingresso na vaga ${vaga} do projeto ${ctx.projeto.nome}. ` +
            'Oficialize a entrada pelos meios institucionais.',
          referenciaId: ctx.candidaturaId
        };
      default: // INGRESSO_DECLINADO
        return {
          destinatarios: coordenador,
          texto: `${ctx.estudanteNome} declinou o ingresso na vaga ${vaga} do projeto ${ctx.projeto.nome}.`,
          referenciaId: ctx.candidaturaId
        };
    }
  }

  /** C10: coordenador e equipe atual do projeto. O clique abre a Pagina do Projeto. */
  private async avisoDeAtividade(evento: EventoDeDominio): Promise<Aviso | null> {
    const atividade = await this.atividades.buscarPorId(evento.origemId);
    if (!atividade) return null;
    const projeto = await this.projetos.buscarPorId(atividade.projetoId);
    if (!projeto) return null;

    const equipe = await this.participacoes.listarDoProjeto(projeto.id);
    const destinatarios = equipe.map((membro) => membro.participacao.usuarioId);
    if (projeto.coordenadorId !== null) destinatarios.push(projeto.coordenadorId);

    return {
      destinatarios,
      texto: `Nova atividade em ${projeto.nome}: ${atividade.titulo}.`,
      referenciaId: projeto.id
    };
  }

  /** C08: o coordenador e avisado para avaliar quem saiu da equipe. */
  private async avisoDeFimDeParticipacao(evento: EventoDeDominio): Promise<Aviso | null> {
    const participacao = await this.participacoes.buscarPorId(evento.origemId);
    if (!participacao) return null;
    const projeto = await this.projetos.buscarPorId(participacao.projetoId);
    if (!projeto || projeto.coordenadorId === null) return null;
    const participante = await this.usuarios.buscarPorId(participacao.usuarioId);

    return {
      destinatarios: [projeto.coordenadorId],
      texto:
        `A participação de ${participante?.nome ?? 'um estudante'} no projeto ${projeto.nome} terminou. ` +
        'Avalie o estudante.',
      referenciaId: participacao.id
    };
  }

  private async administradores(): Promise<number[]> {
    const todos = await this.usuarios.listarTodos();
    return todos.filter((u) => u.ehAdministrador()).map((u) => u.id);
  }

  private async avisoDeIncorporacao(evento: EventoDeDominio): Promise<Aviso | null> {
    const pedido = await this.pedidos.buscarPorId(evento.origemId);
    if (!pedido) return null;
    const projeto = await this.projetos.buscarPorId(pedido.projetoId);
    if (!projeto) return null;

    return {
      destinatarios: [pedido.coordenadorId],
      texto:
        pedido.status === 'DEFERIDO'
          ? `Seu pedido de incorporação do projeto ${projeto.nome} foi aprovado.`
          : `Seu pedido de incorporação do projeto ${projeto.nome} não foi aprovado.`,
      referenciaId: pedido.id
    };
  }
}
