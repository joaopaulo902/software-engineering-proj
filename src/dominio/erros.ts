/**
 * Erros do dominio.
 *
 * Nenhum deles conhece HTTP. Quem traduz um erro destes em codigo de status e
 * a camada de apresentacao. Isso atende ao passo 10 do roteiro de camadas:
 * o erro e tratado na camada mais baixa que consegue entende-lo e, quando
 * precisa subir, chega a camada de cima no vocabulario dela.
 */
export abstract class ErroDeDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** O recurso pedido nao existe. */
export class NaoEncontrado extends ErroDeDominio {}

/** O pedido e valido, mas uma regra do negocio o impede. */
export class RegraDeNegocio extends ErroDeDominio {}

/** O usuario esta autenticado, mas o papel dele nao permite a acao. */
export class SemPermissao extends ErroDeDominio {}

/** Nao ha usuario autenticado na sessao. */
export class NaoAutenticado extends ErroDeDominio {}
