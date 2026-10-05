import { Candidatura } from '../entidades/Candidatura';
import { NaoEncontrado, RegraDeNegocio, SemPermissao } from '../erros';
import { IUnidadeDeTrabalho } from '../../persistencia/interfaces/IUnidadeDeTrabalho';
import {
  ICandidaturaRepository,
  CandidaturaComVaga
} from '../../persistencia/interfaces/ICandidaturaRepository';
import { IVagaRepository } from '../../persistencia/interfaces/IVagaRepository';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';

/**
 * C04 - Candidatar-se a Vaga de Extensao.
 *
 * Esta classe e o dono das regras de negocio e da transacao. Ela nao conhece
 * HTTP (nao ha `req` nem `res` aqui) e nao conhece SQL (nao ha uma unica
 * query). Recebe as dependencias pelo construtor, sempre como INTERFACE, que
 * e a inversao de dependencia do SOLID.
 */
export class CandidaturaService {
  constructor(
    private readonly unidade: IUnidadeDeTrabalho,
    private readonly candidaturas: ICandidaturaRepository,
    private readonly vagas: IVagaRepository,
    private readonly usuarios: IUsuarioRepository
  ) {}

  /**
   * Fluxo basico do C04.
   *
   * Tudo abaixo roda dentro de UMA transacao. Se qualquer passo lancar erro,
   * nada e gravado: nem a candidatura, nem o desconto da posicao na vaga.
   */
  async candidatar(
    estudanteId: number,
    vagaId: number,
    mensagem: string | null
  ): Promise<Candidatura> {
    return this.unidade.emTransacao(async (tx) => {
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
      //    O banco tambem recusa pelo UNIQUE (vaga_id, estudante_id); esta
      //    verificacao existe para devolver uma mensagem legivel.
      if (await this.candidaturas.existe(estudanteId, vagaId, tx)) {
        throw new RegraDeNegocio('Você já se candidatou a esta vaga.');
      }

      // 4. Regras da vaga. Quem responde cada pergunta e a propria entidade.
      if (!vaga.prazoAberto()) {
        throw new RegraDeNegocio('O prazo de inscrição desta vaga já encerrou.');
      }
      if (!vaga.aceitaSemestre(estudante.semestreAtual())) {
        throw new RegraDeNegocio(
          `Esta vaga exige estar no ${vaga.semestreMinimo}º semestre ou acima. ` +
            `Você está no ${estudante.semestreAtual()}º.`
        );
      }
      if (!vaga.temPosicaoDisponivel()) {
        throw new RegraDeNegocio('Esta vaga não tem mais posições disponíveis.');
      }

      // 5. Grava a candidatura e reserva a posicao. Os dois juntos, ou nenhum.
      const candidatura = await this.candidaturas.inserir(estudanteId, vagaId, mensagem, tx);
      await this.vagas.reservarUmaPosicao(vagaId, tx);

      return candidatura;
    });
  }

  /** C05 - Acompanhar Status das Candidaturas (leitura, sem transacao). */
  async listarDoEstudante(estudanteId: number): Promise<CandidaturaComVaga[]> {
    return this.candidaturas.listarDoEstudante(estudanteId);
  }
}
