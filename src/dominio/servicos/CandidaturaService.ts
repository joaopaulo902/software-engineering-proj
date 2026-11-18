import { Candidatura } from '../entidades/Candidatura';
import { HistoricoDeStatus } from '../entidades/HistoricoDeStatus';
import { Participacao } from '../entidades/Participacao';
import { Usuario } from '../entidades/Usuario';
import { hojeComoDia } from '../calendario';
import {
  NaoEncontrado,
  RegraDeNegocio,
  SemPermissao,
} from '../erros';
import { evento } from '../eventos/EventoDeDominio';
import { PublicadorDeEventos } from '../eventos/PublicadorDeEventos';

import {
  IUnidadeDeTrabalho,
  Transacao,
} from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import {
  CandidaturaComVaga,
  CandidaturaRecebida,
  FiltroDeCandidaturas,
  ICandidaturaRepository,
} from '../../persistencia/interfaces/ICandidaturaRepository';
import { IVagaRepository } from '../../persistencia/interfaces/IVagaRepository';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';
import { IParticipacaoRepository } from '../../persistencia/interfaces/IParticipacaoRepository';

/** O que o coordenador decide no C11 (enum Decisao do diagrama 5). */
export type Decisao = 'ACEITAR' | 'RECUSAR';

/** Tela Minha candidatura (C05): a candidatura e a linha do tempo dela. */
export interface DetalheDaCandidatura {
  candidatura: CandidaturaComVaga;
  historico: HistoricoDeStatus[];
}

/**
 * Tela Candidatura do coordenador (C15). O diagrama devolve so a
 * CandidaturaRecebida; a linha do tempo vai junto para a coordenacao ler o
 * motivo de um declinio.
 */
export interface DetalheDaCandidaturaRecebida extends CandidaturaRecebida {
  historico: HistoricoDeStatus[];
}

/** Cargo de quem entra pela candidatura; o coordenador muda depois em Participantes. */
export const CARGO_INICIAL = 'Participante';

/**
 * Candidaturas: C04, C05, C07, C11, C15 e C18.
 *
 * Esta classe e o dono das regras de negocio e da transacao. Ela nao conhece
 * HTTP (nao ha `req` nem `res` aqui) e nao conhece SQL (nao ha uma unica
 * query). Recebe as dependencias pelo construtor, sempre como INTERFACE, que
 * e a inversao de dependencia do SOLID.
 *
 * Quais transicoes de status valem e decidido pela propria Candidatura
 * (padrao State); quem fica sabendo de cada uma, pelo NotificadorInApp
 * (padrao Observer). Os eventos sao publicados DEPOIS do COMMIT.
 *
 * Regra de ouro dentro de `emTransacao`: toda chamada a repositorio recebe
 * `tx`. Uma consulta sem `tx` no meio de uma transacao trava o PGlite
 * (`npm run verificar` e `dev:memoria`). Por isso o que nao aceita `tx`
 * (ex.: `buscarRecebida`) e lido antes de abrir a transacao.
 */
export class CandidaturaService {

  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly candidaturas: ICandidaturaRepository,
    private readonly vagas: IVagaRepository,
    private readonly usuarios: IUsuarioRepository,
    /**
     * Opcionais so para nao quebrar quem ainda monta o servico com quatro
     * argumentos (`src/verificacoes/frenteC.ts`). O main.ts passa os dois.
     * Sem `participacoes`, o C07 falha e o C04 nao confere a equipe; sem
     * `eventos`, ninguem e avisado.
     */
    private readonly participacoes?: IParticipacaoRepository,
    private readonly eventos: PublicadorDeEventos = new PublicadorDeEventos()
  ) {}

  // C04

  /**
   * Fluxo basico do C04.
   *
   * Tudo roda dentro de UMA transacao. Se qualquer passo lancar erro, nada e
   * gravado: nem a candidatura, nem o historico, nem o desconto da posicao.
   */
  async candidatar(
    estudanteId: number,
    vagaId: number,
    mensagem: string | null
  ): Promise<Candidatura> {

    const agora = new Date();

    const candidatura = await this.unidade.emTransacao(async (tx) => {

      // 1. Trava a linha da vaga. Outra candidatura para a MESMA vaga espera
      //    aqui ate esta transacao terminar. Sem esta trava, dois estudantes
      //    poderiam ler "resta 1" ao mesmo tempo e ambos seriam aceitos.
      const vaga = await this.vagas.buscarParaAtualizacao(vagaId, tx);
      if (!vaga) {
        throw new NaoEncontrado('Vaga não encontrada.');
      }

      // 2. Quem esta pedindo
      const estudante = await this.usuarios.buscarPorId(estudanteId, tx);
      if (!estudante) {
        throw new NaoEncontrado('Usuário não encontrado.');
      }
      if (!estudante.ehEstudante()) {
        throw new SemPermissao('Apenas estudantes podem se candidatar a vagas.');
      }

      // 3. Candidatura repetida vem ANTES das regras da vaga: para quem ja se
      //    candidatou, "voce já se candidatou" e uma resposta mais util do que
      //    "a vaga esgotou" — e foi ele mesmo quem ocupou a ultima posicao.
      //    Uma candidatura removida (C18) nao conta. O banco tambem recusa,
      //    pelo indice unico parcial; esta verificacao da a mensagem legivel.
      if (await this.candidaturas.existeNaoRemovida(estudanteId, vagaId, tx)) {
        throw new RegraDeNegocio('Você já se candidatou a esta vaga.');
      }

      // 4. Regras da vaga: a regra unica de elegibilidade da frente C (prazo,
      //    perfil, curso, semestre e posicao), a mesma que a tela Detalhes
      //    da Vaga (C03) usa para mostrar o motivo.
      const motivo = vaga.motivoDeInelegibilidade(estudante, agora);
      if (motivo) {
        throw new RegraDeNegocio(motivo);
      }

      // 5. Quem ja faz parte da equipe do projeto nao se candidata a outra
      //    vaga dele. Sem esta regra, o coordenador aprovaria (C11), o C07
      //    recusaria a confirmacao, e a posicao ficaria presa numa candidatura
      //    aceita que nunca vira participacao. E a mesma regra do C07.
      if (
        this.participacoes &&
        (await this.participacoes.estaVinculado(estudanteId, vaga.projetoId, tx))
      ) {
        throw new RegraDeNegocio('Você já faz parte da equipe deste projeto.');
      }

      // 6. Grava a candidatura (com a primeira linha do historico) e reserva
      //    a posicao. Tudo junto, ou nada.
      const nova = await this.candidaturas.inserir(estudanteId, vagaId, mensagem, tx);
      if (nova.ocupaPosicao()) {
        await this.vagas.reservarUmaPosicao(vagaId, tx);
      }

      return nova;

    });

    // Depois do COMMIT: o aviso nunca fala de uma candidatura desfeita.
    await this.eventos.publicar(evento('CANDIDATURA_CRIADA', candidatura.id, estudanteId));

    return candidatura;

  }

  // C05

  /** Lista do estudante (leitura, sem transacao). As removidas nao aparecem. */
  async listarDoEstudante(estudanteId: number): Promise<CandidaturaComVaga[]> {
    return this.candidaturas.listarDoEstudante(estudanteId);
  }

  /** Minha candidatura: a candidatura e o historico do processo seletivo. */
  async detalhar(estudanteId: number, candidaturaId: number): Promise<DetalheDaCandidatura> {

    const candidatura = await this.candidaturas.buscarDoEstudante(estudanteId, candidaturaId);
    if (!candidatura) {
      throw new NaoEncontrado('Candidatura não encontrada.');
    }
    const historico = await this.candidaturas.listarHistorico(candidaturaId);

    return { candidatura, historico };

  }

  // C18

  /** O estudante retira a candidatura em analise; a posicao volta para a vaga. */
  async remover(
    estudanteId: number,
    candidaturaId: number,
    agora: Date = new Date()
  ): Promise<void> {

    await this.unidade.emTransacao(async (tx) => {

      const candidatura = await this.candidaturaDoEstudante(estudanteId, candidaturaId, tx);
      const ocupava = candidatura.ocupaPosicao();
      candidatura.remover(agora);
      await this.gravarTransicao(candidatura, ocupava, tx);

    });

  }

  // C07

  /**
   * Fluxo basico do C07: o estudante aceito confirma e entra na equipe.
   *
   * A posicao continua ocupada (agora por um membro da equipe). Se a vaga
   * tem duracao, a participacao ja nasce com a data prevista de fim.
   */
  async confirmarIngresso(
    estudanteId: number,
    candidaturaId: number,
    agora: Date = new Date()
  ): Promise<Participacao> {

    const participacoes = this.exigirParticipacoes();

    const participacao = await this.unidade.emTransacao(async (tx) => {

      const candidatura = await this.candidaturaDoEstudante(estudanteId, candidaturaId, tx);
      const ocupava = candidatura.ocupaPosicao();
      candidatura.confirmar(agora); // o State recusa se nao estiver ACEITA

      const vaga = await this.vagas.buscarPorId(candidatura.vagaId, tx);
      if (!vaga) {
        throw new NaoEncontrado('Vaga não encontrada.');
      }

      // No maximo uma participacao ativa por pessoa em cada projeto (o banco
      // tambem garante, pelo indice uq_participacao_ativa).
      if (await participacoes.estaVinculado(estudanteId, vaga.projetoId, tx)) {
        throw new RegraDeNegocio('Você já faz parte da equipe deste projeto.');
      }

      await this.gravarTransicao(candidatura, ocupava, tx);

      const previstoAte =
        vaga.duracaoEmMeses === null ? null : somarMeses(hojeComoDia(agora), vaga.duracaoEmMeses);

      return participacoes.inserir(
        new Participacao(
          0,
          vaga.projetoId,
          estudanteId,
          candidatura.id,
          CARGO_INICIAL,
          agora,
          null,
          previstoAte,
          null
        ),
        tx
      );

    });

    await this.eventos.publicar(evento('INGRESSO_CONFIRMADO', candidaturaId, estudanteId));

    return participacao;

  }

  /**
   * C07, fluxo 2.a: o estudante aceito desiste. O motivo e opcional; a
   * posicao volta para a vaga. (A lista de espera e nivel 3: nao ha
   * "proximo candidato" a chamar.)
   */
  async declinarIngresso(
    estudanteId: number,
    candidaturaId: number,
    motivo: string | null,
    agora: Date = new Date()
  ): Promise<void> {

    await this.unidade.emTransacao(async (tx) => {

      const candidatura = await this.candidaturaDoEstudante(estudanteId, candidaturaId, tx);
      const ocupava = candidatura.ocupaPosicao();
      candidatura.declinar(motivo, agora);
      await this.gravarTransicao(candidatura, ocupava, tx);

    });

    await this.eventos.publicar(evento('INGRESSO_DECLINADO', candidaturaId, estudanteId));

  }

  // C15

  /** Candidaturas as vagas dos projetos do coordenador. As removidas nao aparecem. */
  async listarRecebidas(
    coordenadorId: number,
    filtro: FiltroDeCandidaturas = {}
  ): Promise<CandidaturaRecebida[]> {

    await this.exigirCoordenador(coordenadorId, 'veem as candidaturas recebidas');

    return this.candidaturas.listarDaCoordenacao(coordenadorId, filtro);

  }

  /** Uma candidatura recebida, com a linha do tempo. */
  async detalharRecebida(
    coordenadorId: number,
    candidaturaId: number
  ): Promise<DetalheDaCandidaturaRecebida> {

    await this.exigirCoordenador(coordenadorId, 'veem as candidaturas recebidas');
    const recebida = await this.candidaturas.buscarRecebida(coordenadorId, candidaturaId);
    if (!recebida) {
      throw new NaoEncontrado('Candidatura não encontrada.');
    }
    const historico = await this.candidaturas.listarHistorico(candidaturaId);

    return { ...recebida, historico };

  }

  // C11

  /**
   * O coordenador aprova ou recusa uma candidatura em analise. Aprovar mantem
   * a posicao reservada ate o estudante confirmar ou declinar; recusar a
   * devolve para a vaga.
   */
  async avaliar(
    coordenadorId: number,
    candidaturaId: number,
    decisao: Decisao,
    agora: Date = new Date()
  ): Promise<Candidatura> {

    if (decisao !== 'ACEITAR' && decisao !== 'RECUSAR') {
      throw new RegraDeNegocio('Informe a decisão: ACEITAR ou RECUSAR.');
    }

    // Antes da transacao: `buscarRecebida` nao recebe `tx`. Ela confere que a
    // candidatura e de uma vaga deste coordenador; o status e conferido
    // dentro da transacao, com a linha travada.
    await this.exigirCoordenador(coordenadorId, 'avaliam candidaturas');
    if (!(await this.candidaturas.buscarRecebida(coordenadorId, candidaturaId))) {
      throw new NaoEncontrado('Candidatura não encontrada.');
    }

    const avaliada = await this.unidade.emTransacao(async (tx) => {

      const candidatura = await this.candidaturas.buscarParaAtualizacao(candidaturaId, tx);
      if (!candidatura) {
        throw new NaoEncontrado('Candidatura não encontrada.');
      }
      const ocupava = candidatura.ocupaPosicao();
      if (decisao === 'ACEITAR') {
        candidatura.aceitar(agora);
      } else {
        candidatura.recusar(agora);
      }
      await this.gravarTransicao(candidatura, ocupava, tx);

      return candidatura;

    });

    await this.eventos.publicar(evento('CANDIDATURA_AVALIADA', candidaturaId, coordenadorId));

    return avaliada;

  }

  // apoio

  /** A candidatura existe e e deste estudante, com a linha travada ate o fim da transacao. */
  private async candidaturaDoEstudante(
    estudanteId: number,
    candidaturaId: number,
    tx: Transacao
  ): Promise<Candidatura> {

    const candidatura = await this.candidaturas.buscarParaAtualizacao(candidaturaId, tx);
    // A de outro estudante e "nao encontrada": nao revela que ela existe.
    if (!candidatura || candidatura.estudanteId !== estudanteId) {
      throw new NaoEncontrado('Candidatura não encontrada.');
    }

    return candidatura;

  }

  /**
   * Grava o que uma transicao do State mudou: o status (e o motivo), as
   * linhas novas do historico e, se a candidatura deixou de ocupar posicao,
   * a posicao devolvida a vaga. Quem diz se ocupa e o proprio estado.
   */
  private async gravarTransicao(
    candidatura: Candidatura,
    ocupavaAntes: boolean,
    tx: Transacao
  ): Promise<void> {

    await this.candidaturas.atualizar(candidatura, tx);
    for (const linha of candidatura.historicoNaoGravado()) {
      await this.candidaturas.registrarHistorico(
        linha.candidaturaId,
        linha.status,
        linha.ocorridoEm,
        tx,
        linha.observacao
      );
    }
    if (ocupavaAntes && !candidatura.ocupaPosicao()) {
      await this.vagas.liberarUmaPosicao(candidatura.vagaId, tx);
    }

  }

  private async exigirCoordenador(usuarioId: number, acao: string): Promise<Usuario> {

    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NaoEncontrado('Usuário não encontrado.');
    }
    if (!usuario.ehCoordenador()) {
      throw new SemPermissao(`Apenas coordenadores ${acao}.`);
    }

    return usuario;

  }

  private exigirParticipacoes(): IParticipacaoRepository {

    if (!this.participacoes) {
      throw new Error('CANDIDATURASERVICE MONTADO SEM IPARTICIPACAOREPOSITORY: PASSE-O NO CONSTRUTOR');
    }

    return this.participacoes;

  }

}

/**
 * Dia de calendario `meses` depois de `dia` (convencao de calendario.ts). Se
 * o dia nao existe no mes final, vale o ultimo dia dele: 31/01 + 1 = 28/02.
 */
function somarMeses(dia: Date, meses: number): Date {

  const ano = dia.getUTCFullYear();
  const mes = dia.getUTCMonth() + meses;
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

  return new Date(Date.UTC(ano, mes, Math.min(dia.getUTCDate(), ultimoDiaDoMes)));

}
