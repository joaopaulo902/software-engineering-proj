import {
  Request,
  Response,
  NextFunction,
} from 'express';

import {
  CandidaturaService,
  Decisao,
} from '../../dominio/servicos/CandidaturaService';
import {
  Candidatura,
  STATUS_DE_CANDIDATURA,
  StatusCandidatura,
} from '../../dominio/entidades/Candidatura';
import { HistoricoDeStatus } from '../../dominio/entidades/HistoricoDeStatus';

import {
  CandidaturaComVaga,
  CandidaturaRecebida,
} from '../../persistencia/interfaces/ICandidaturaRepository';

import { lerLista } from '../parametros';

const DECISOES: Decisao[] = ['ACEITAR', 'RECUSAR'];
const LIMITE_DE_TEXTO = 500;

/**
 * Maior valor de uma coluna INTEGER/SERIAL do PostgreSQL. Um id acima disso
 * nao existe, e o banco recusaria a consulta com erro (que viraria 500).
 */
const MAIOR_ID = 2147483647;

/**
 * Tradutor entre o mundo HTTP e o dominio.
 *
 * Nao decide NADA de negocio: so le o `req`, confere o formato dos dados,
 * chama o servico e transforma o resultado em resposta. Quem decide se o
 * estudante pode se candidatar, remover, confirmar ou declinar, e se o
 * coordenador pode avaliar, e o CandidaturaService (e o State da Candidatura).
 *
 * O formato das respostas e o que o front A le (docs/cliente-web.md, secao 3):
 * campos no primeiro nivel. Erros de formato voltam 400 com `{ erro }`; os
 * de negocio passam pelo tratadorDeErros.
 */
export class CandidaturaController {

  constructor(private readonly servico: CandidaturaService) {}

  /** POST /api/candidaturas - C04 */
  criar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const estudanteId = req.session.usuarioId as number;
      const vagaId = lerIdDoBanco(req.body?.vagaId);
      const mensagem = lerTextoOpcional(req.body?.mensagem);

      if (!vagaId) {
        res.status(400).json({ erro: 'Informe uma vaga válida.' });
        return;
      }
      if (mensagem === undefined) {
        res.status(400).json({ erro: 'A mensagem deve ser um texto.' });
        return;
      }
      if (mensagem !== null && mensagem.length > LIMITE_DE_TEXTO) {
        res.status(400).json({ erro: 'A mensagem deve ter no máximo 500 caracteres.' });
        return;
      }
      if (mensagem !== null && temCaractereNulo(mensagem)) {
        res.status(400).json({ erro: 'A mensagem tem um caractere inválido.' });
        return;
      }

      const candidatura = await this.servico.candidatar(estudanteId, vagaId, mensagem);

      res.status(201).json({
        id: candidatura.id,
        vagaId: candidatura.vagaId,
        status: candidatura.status,
        criadaEm: candidatura.criadaEm
      });
    } catch (erro) {
      next(erro);
    }

  };

  /** GET /api/candidaturas/minhas - C05 */
  listarMinhas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const estudanteId = req.session.usuarioId as number;
      const lista = await this.servico.listarDoEstudante(estudanteId);
      res.json(lista.map(apresentarComVaga));
    } catch (erro) {
      next(erro);
    }

  };

  /** GET /api/candidaturas/:id - C05 (Minha candidatura, com o historico) */
  detalhar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const candidaturaId = lerIdDoBanco(req.params.id);
      if (!candidaturaId) {
        res.status(400).json({ erro: 'Candidatura inválida.' });
        return;
      }

      const detalhe = await this.servico.detalhar(req.session.usuarioId as number, candidaturaId);
      res.json({
        ...apresentarComVaga(detalhe.candidatura),
        historico: detalhe.historico.map(apresentarHistorico)
      });
    } catch (erro) {
      next(erro);
    }

  };

  /** DELETE /api/candidaturas/:id - C18 */
  remover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const candidaturaId = lerIdDoBanco(req.params.id);
      if (!candidaturaId) {
        res.status(400).json({ erro: 'Candidatura inválida.' });
        return;
      }

      await this.servico.remover(req.session.usuarioId as number, candidaturaId);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }

  };

  /** POST /api/candidaturas/:id/confirmacao - C07 */
  confirmar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const candidaturaId = lerIdDoBanco(req.params.id);
      if (!candidaturaId) {
        res.status(400).json({ erro: 'Candidatura inválida.' });
        return;
      }

      const participacao = await this.servico.confirmarIngresso(
        req.session.usuarioId as number,
        candidaturaId
      );
      res.status(201).json({
        participacaoId: participacao.id,
        projetoId: participacao.projetoId,
        cargo: participacao.cargo,
        inicio: participacao.inicio,
        previstoAte: participacao.previstoAte
      });
    } catch (erro) {
      next(erro);
    }

  };

  /** POST /api/candidaturas/:id/declinio  { motivo: texto | null } - C07, fluxo 2.a */
  declinar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const candidaturaId = lerIdDoBanco(req.params.id);
      if (!candidaturaId) {
        res.status(400).json({ erro: 'Candidatura inválida.' });
        return;
      }
      const motivo = lerTextoOpcional(req.body?.motivo);
      if (motivo === undefined) {
        res.status(400).json({ erro: 'O motivo deve ser um texto.' });
        return;
      }
      if (motivo !== null && motivo.length > LIMITE_DE_TEXTO) {
        res.status(400).json({ erro: 'O motivo deve ter no máximo 500 caracteres.' });
        return;
      }
      if (motivo !== null && temCaractereNulo(motivo)) {
        res.status(400).json({ erro: 'O motivo tem um caractere inválido.' });
        return;
      }

      await this.servico.declinarIngresso(req.session.usuarioId as number, candidaturaId, motivo);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }

  };

  /** GET /api/candidaturas/recebidas?vagaId=1&status=EM_ANALISE&status=ACEITA - C15 */
  listarRecebidas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      let vagaId: number | null = null;
      if (req.query.vagaId !== undefined && req.query.vagaId !== '') {
        vagaId = lerIdDoBanco(req.query.vagaId);
        if (!vagaId) {
          res.status(400).json({ erro: 'Vaga inválida.' });
          return;
        }
      }

      // `status` pode vir repetido (?status=A&status=B) ou separado por virgula.
      const status = lerLista(req.query.status);
      const desconhecido = status.find(
        (s) => !STATUS_DE_CANDIDATURA.includes(s as StatusCandidatura)
      );
      if (desconhecido) {
        res.status(400).json({ erro: `Status desconhecido: ${desconhecido}.` });
        return;
      }

      const lista = await this.servico.listarRecebidas(req.session.usuarioId as number, {
        vagaId,
        status: status as StatusCandidatura[]
      });
      res.json(lista.map(apresentarRecebida));
    } catch (erro) {
      next(erro);
    }

  };

  /** GET /api/candidaturas/recebidas/:id - C15 (com o historico) */
  detalharRecebida = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const candidaturaId = lerIdDoBanco(req.params.id);
      if (!candidaturaId) {
        res.status(400).json({ erro: 'Candidatura inválida.' });
        return;
      }

      const detalhe = await this.servico.detalharRecebida(
        req.session.usuarioId as number,
        candidaturaId
      );
      res.json({
        ...apresentarRecebida(detalhe),
        historico: detalhe.historico.map(apresentarHistorico)
      });
    } catch (erro) {
      next(erro);
    }

  };

  /** POST /api/candidaturas/:id/avaliacao  { decisao: 'ACEITAR' | 'RECUSAR' } - C11 */
  avaliar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const candidaturaId = lerIdDoBanco(req.params.id);
      if (!candidaturaId) {
        res.status(400).json({ erro: 'Candidatura inválida.' });
        return;
      }
      const decisao = req.body?.decisao;
      if (!DECISOES.includes(decisao)) {
        res.status(400).json({ erro: 'Informe a decisão: ACEITAR ou RECUSAR.' });
        return;
      }

      const candidatura = await this.servico.avaliar(
        req.session.usuarioId as number,
        candidaturaId,
        decisao
      );
      res.json(apresentarCandidatura(candidatura));
    } catch (erro) {
      next(erro);
    }

  };

}

/**
 * Id (da rota, da consulta ou do corpo) que existe como chave no banco: um
 * inteiro positivo escrito so com digitos, ate o maior INTEGER. `null` em
 * qualquer outro caso: `true`, `[5]`, `"0x5"`, `"1e21"`, `5.5`, `3000000000`.
 */
function lerIdDoBanco(valor: unknown): number | null {

  const texto = typeof valor === 'number' ? String(valor) : valor;
  if (typeof texto !== 'string' || !/^[1-9][0-9]*$/.test(texto)) return null;
  const id = Number(texto);

  return id <= MAIOR_ID ? id : null;

}

/**
 * O PostgreSQL nao guarda o caractere NUL (U+0000) em texto: a gravacao
 * falharia com erro de codificacao (500). Recusado antes, com 400.
 */
function temCaractereNulo(texto: string): boolean {
  return texto.includes('\u0000');
}

/**
 * Texto opcional do corpo: ausente, `null` ou so espacos viram `null`;
 * qualquer coisa que nao seja texto vira `undefined` (formato invalido).
 */
function lerTextoOpcional(valor: unknown): string | null | undefined {

  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();

  return texto.length > 0 ? texto : null;

}

function apresentarCandidatura(candidatura: Candidatura) {

  return {
    id: candidatura.id,
    vagaId: candidatura.vagaId,
    status: candidatura.status,
    mensagem: candidatura.mensagem,
    motivoDeclinio: candidatura.motivoDeclinio,
    criadaEm: candidatura.criadaEm
  };

}

/** Como o estudante ve (C05): GET /minhas e GET /:id. */
function apresentarComVaga(item: CandidaturaComVaga) {

  return {
    ...apresentarCandidatura(item.candidatura),
    vagaTitulo: item.vagaTitulo,
    projetoId: item.projetoId,
    projetoNome: item.projetoNome,
    coordenadorNome: item.coordenadorNome
  };

}

/**
 * Como o coordenador ve (C15). Do estudante saem so os dados de perfil que a
 * tela mostra; e-mail e o resto ficam de fora.
 */
function apresentarRecebida(item: CandidaturaRecebida) {

  return {
    ...apresentarCandidatura(item.candidatura),
    vagaTitulo: item.vagaTitulo,
    projetoNome: item.projetoNome,
    estudante: {
      id: item.estudante.id,
      nome: item.estudante.nome,
      curso: item.estudante.curso,
      semestre: item.estudante.semestre
    }
  };

}

function apresentarHistorico(linha: HistoricoDeStatus) {

  return {
    status: linha.status,
    ocorridoEm: linha.ocorridoEm,
    observacao: linha.observacao
  };

}
