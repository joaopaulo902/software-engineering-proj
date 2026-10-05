import { Request, Response, NextFunction } from 'express';
import { CandidaturaService } from '../../dominio/servicos/CandidaturaService';

/**
 * Tradutor entre o mundo HTTP e o dominio.
 *
 * Nao decide NADA de negocio: so le o `req`, confere o formato dos dados,
 * chama o servico e transforma o resultado em resposta. Quem decide se o
 * estudante pode se candidatar e o CandidaturaService.
 */
export class CandidaturaController {
  constructor(private readonly servico: CandidaturaService) {}

  /** POST /api/candidaturas - C04 */
  criar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estudanteId = req.session.usuarioId as number;
      const vagaId = Number(req.body?.vagaId);
      const mensagemBruta = req.body?.mensagem;
      const mensagem = typeof mensagemBruta === 'string' ? mensagemBruta.trim() : '';

      if (!Number.isInteger(vagaId) || vagaId <= 0) {
        res.status(400).json({ erro: 'Informe uma vaga válida.' });
        return;
      }
      if (mensagem.length > 500) {
        res.status(400).json({ erro: 'A mensagem deve ter no máximo 500 caracteres.' });
        return;
      }

      const candidatura = await this.servico.candidatar(
        estudanteId,
        vagaId,
        mensagem.length > 0 ? mensagem : null
      );

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

      res.json(
        lista.map((item) => ({
          id: item.candidatura.id,
          status: item.candidatura.status,
          mensagem: item.candidatura.mensagem,
          criadaEm: item.candidatura.criadaEm,
          vagaTitulo: item.vagaTitulo,
          projetoNome: item.projetoNome
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };
}
