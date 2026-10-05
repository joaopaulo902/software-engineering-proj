import { RequestHandler } from 'express';

/**
 * Barra a requisicao quando nao ha usuario na sessao.
 *
 * Escrito uma vez, aplicado em todas as rotas que precisam. Sem este
 * middleware, a mesma verificacao apareceria repetida em cada controller.
 */
export const exigirLogin: RequestHandler = (req, res, next) => {
  if (!req.session.usuarioId) {
    res.status(401).json({ erro: 'Entre no sistema para continuar.' });
    return;
  }
  next();
};
