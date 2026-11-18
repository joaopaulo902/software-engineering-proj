import { RegraDeNegocio } from '../erros';
import type {
  Candidatura,
  StatusCandidatura,
} from './Candidatura';

/**
 * Padrao State da Candidatura (pagina 3 do diagrama de classes).
 *
 * Cada status e uma classe que sabe quais acoes sao permitidas nele e para
 * onde cada uma leva:
 *
 *   EM_ANALISE --aceitar (C11)--> ACEITA --confirmar (C07)--> CONFIRMADA
 *        |     \--recusar (C11)--> RECUSADA
 *        |                         ACEITA --declinar (C07 2.a)--> DECLINADA
 *        \--remover (C18)--> REMOVIDA
 *
 * O servico nunca compara status com `if`: ele pede a acao a candidatura, e o
 * estado atual aceita ou lanca RegraDeNegocio. A regra de "quem ocupa uma
 * posicao na vaga" tambem mora aqui (`ocupaPosicao`).
 */
export interface EstadoCandidatura {
  status(): StatusCandidatura;
  aceitar(c: Candidatura, agora: Date): void;
  recusar(c: Candidatura, agora: Date): void;
  confirmar(c: Candidatura, agora: Date): void;
  declinar(c: Candidatura, motivo: string | null, agora: Date): void;
  remover(c: Candidatura, agora: Date): void;
  /** A candidatura segura uma das posicoes da vaga enquanto estiver neste estado. */
  ocupaPosicao(): boolean;
}

/**
 * Comportamento padrao: toda acao nao sobrescrita e proibida no estado atual.
 * Recusada, Declinada e Removida nao sobrescrevem nada: sao finais e nao
 * ocupam posicao.
 */
export abstract class EstadoBase implements EstadoCandidatura {

  /** O objeto de estado de cada status gravado no banco. */
  static para(status: StatusCandidatura): EstadoCandidatura {

    switch (status) {
      case 'EM_ANALISE':
        return new EmAnalise();
      case 'ACEITA':
        return new Aceita();
      case 'CONFIRMADA':
        return new Confirmada();
      case 'RECUSADA':
        return new Recusada();
      case 'DECLINADA':
        return new Declinada();
      case 'REMOVIDA':
        return new Removida();
    }
    throw new Error(`STATUS DE CANDIDATURA DESCONHECIDO: ${String(status)}`);

  }

  abstract status(): StatusCandidatura;

  aceitar(_c: Candidatura, _agora: Date): void {
    throw new RegraDeNegocio(SO_EM_ANALISE_AVALIA);
  }

  recusar(_c: Candidatura, _agora: Date): void {
    throw new RegraDeNegocio(SO_EM_ANALISE_AVALIA);
  }

  confirmar(_c: Candidatura, _agora: Date): void {
    throw new RegraDeNegocio('Só é possível confirmar o ingresso de uma candidatura aceita.');
  }

  declinar(_c: Candidatura, _motivo: string | null, _agora: Date): void {
    throw new RegraDeNegocio('Só é possível declinar o ingresso de uma candidatura aceita.');
  }

  remover(_c: Candidatura, _agora: Date): void {
    throw new RegraDeNegocio('Só é possível remover uma candidatura que ainda está em análise.');
  }

  ocupaPosicao(): boolean {
    return false;
  }

}

const SO_EM_ANALISE_AVALIA = 'Só é possível avaliar uma candidatura que está em análise.';

/** Recem-enviada (C04). O coordenador avalia; o estudante ainda pode remover. */
export class EmAnalise extends EstadoBase {

  status(): StatusCandidatura {
    return 'EM_ANALISE';
  }

  aceitar(c: Candidatura, agora: Date): void {
    c.transicionarPara(new Aceita(), agora);
  }

  recusar(c: Candidatura, agora: Date): void {
    c.transicionarPara(new Recusada(), agora);
  }

  remover(c: Candidatura, agora: Date): void {
    c.transicionarPara(new Removida(), agora);
  }

  /** A posicao e reservada no C04, para dois estudantes nao disputarem a mesma. */
  ocupaPosicao(): boolean {
    return true;
  }

}

/** Aprovada pelo coordenador (C11). Falta o estudante confirmar ou declinar (C07). */
export class Aceita extends EstadoBase {

  status(): StatusCandidatura {
    return 'ACEITA';
  }

  confirmar(c: Candidatura, agora: Date): void {
    c.transicionarPara(new Confirmada(), agora);
  }

  declinar(c: Candidatura, motivo: string | null, agora: Date): void {

    const texto = motivo?.trim() || null;
    c.registrarMotivoDeclinio(texto);
    c.transicionarPara(new Declinada(), agora, texto);

  }

  ocupaPosicao(): boolean {
    return true;
  }

}

/** O estudante entrou na equipe (C07). A posicao fica com ele. */
export class Confirmada extends EstadoBase {

  status(): StatusCandidatura {
    return 'CONFIRMADA';
  }

  ocupaPosicao(): boolean {
    return true;
  }

}

/** Final: o coordenador nao selecionou (C11). */
export class Recusada extends EstadoBase {

  status(): StatusCandidatura {
    return 'RECUSADA';
  }

}

/** Final: o estudante desistiu depois de aceito (C07, fluxo 2.a). */
export class Declinada extends EstadoBase {

  status(): StatusCandidatura {
    return 'DECLINADA';
  }

}

/** Final: o estudante retirou a candidatura em analise (C18). Libera nova candidatura a mesma vaga. */
export class Removida extends EstadoBase {

  status(): StatusCandidatura {
    return 'REMOVIDA';
  }

}
