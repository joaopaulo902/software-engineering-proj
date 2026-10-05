import { Request, Response, NextFunction } from 'express';
import { IUsuarioRepository } from '../../persistencia/interfaces/IUsuarioRepository';

/**
 * Login SIMPLIFICADO para a demonstracao.
 *
 * SIMPLIFICACAO DECLARADA: nao ha senha nem autenticacao real. O usuario e
 * escolhido numa lista. Na Etapa 3 isso vira autenticacao com credencial.
 * A simplificacao nao afeta a arquitetura: o middleware `exigirLogin` e os
 * controllers continuam iguais quando a autenticacao de verdade entrar.
 */
export class SessaoController {
  constructor(private readonly usuarios: IUsuarioRepository) {}

  /** GET /api/usuarios - popula o seletor da tela de entrada */
  listarUsuarios = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lista = await this.usuarios.listarTodos();
      res.json(
        lista.map((u) => ({
          id: u.id,
          nome: u.nome,
          papel: u.papel,
          curso: u.curso,
          semestre: u.semestre
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  /** POST /api/sessao */
  entrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = Number(req.body?.usuarioId);
      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        res.status(400).json({ erro: 'Escolha um usuário.' });
        return;
      }

      const usuario = await this.usuarios.buscarPorId(usuarioId);
      if (!usuario) {
        res.status(404).json({ erro: 'Usuário não encontrado.' });
        return;
      }

      req.session.usuarioId = usuario.id;
      res.json(apresentar(usuario));
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /api/sessao */
  atual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.session.usuarioId) {
        res.status(401).json({ erro: 'Nenhum usuário na sessão.' });
        return;
      }
      const usuario = await this.usuarios.buscarPorId(req.session.usuarioId);
      if (!usuario) {
        res.status(401).json({ erro: 'Nenhum usuário na sessão.' });
        return;
      }
      res.json(apresentar(usuario));
    } catch (erro) {
      next(erro);
    }
  };

  /** DELETE /api/sessao */
  sair = (req: Request, res: Response): void => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  };
}

function apresentar(usuario: {
  id: number;
  nome: string;
  papel: string;
  curso: string | null;
  semestre: number | null;
}) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    papel: usuario.papel,
    curso: usuario.curso,
    semestre: usuario.semestre
  };
}
