import { ErrorRequestHandler } from 'express';
import {
  NaoAutenticado,
  NaoEncontrado,
  RegraDeNegocio,
  SemPermissao
} from '../../dominio/erros';

/**
 * Traduz erro de dominio em codigo de status HTTP.
 *
 * Este e o unico ponto do sistema que faz essa traducao. O dominio lanca um
 * erro no vocabulario dele; aqui ele vira a resposta que o navegador entende.
 *
 * As duas ultimas verificacoes pegam as barreiras do proprio banco: se a
 * regra escapar do servico por qualquer motivo, a constraint ainda recusa, e
 * o usuario recebe uma mensagem legivel em vez de um erro 500.
 */
export const tratadorDeErros: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof NaoAutenticado) {
    res.status(401).json({ erro: erro.message });
    return;
  }
  if (erro instanceof SemPermissao) {
    res.status(403).json({ erro: erro.message });
    return;
  }
  if (erro instanceof NaoEncontrado) {
    res.status(404).json({ erro: erro.message });
    return;
  }
  if (erro instanceof RegraDeNegocio) {
    res.status(409).json({ erro: erro.message });
    return;
  }

  const codigo = (erro as { code?: string })?.code;

  // UNIQUE (vaga_id, estudante_id)
  if (codigo === '23505') {
    res.status(409).json({ erro: 'Você já se candidatou a esta vaga.' });
    return;
  }
  // CHECK (vagas_restantes >= 0)
  if (codigo === '23514') {
    res.status(409).json({ erro: 'Esta vaga não tem mais posições disponíveis.' });
    return;
  }

  console.error('[erro nao tratado]', erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
};
