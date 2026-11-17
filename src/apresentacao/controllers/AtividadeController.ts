import { Request, Response, NextFunction } from 'express';
import { AtividadeService } from '../../dominio/servicos/AtividadeService';
import { Atividade, DadosAtividade } from '../../dominio/entidades/Atividade';
import { lerId, lerLista, lerTexto } from '../parametros';
import { apresentarAtividade } from '../apresentadores';

export class AtividadeController {
  constructor(private readonly servico: AtividadeService) {}

  /** GET /api/atividades?termo=&areas= - feed */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lista = await this.servico.listarRecentes({
        termo: lerTexto(req.query.termo),
        areas: lerLista(req.query.areas)
      });
      res.json(lista.map(apresentarAtividade));
    } catch (erro) {
      next(erro);
    }
  };

  /** POST /api/projetos/:id/atividades  { titulo, descricao, foto? } - C10 */
  postar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projetoId = lerId(req.params.id);
      if (!projetoId) {
        res.status(400).json({ erro: 'Projeto inválido.' });
        return;
      }
      const leitura = lerNovaAtividade(req.body ?? {});
      if (typeof leitura === 'string') {
        res.status(400).json({ erro: leitura });
        return;
      }

      const atividade = await this.servico.postar(
        req.session.usuarioId as number,
        projetoId,
        leitura
      );
      res.status(201).json(apresentar(atividade));
    } catch (erro) {
      next(erro);
    }
  };
}

/** Le o corpo do pedido. Devolve os dados prontos, ou o texto do primeiro problema. */
function lerNovaAtividade(corpo: any): DadosAtividade | string {
  const titulo = lerTexto(corpo.titulo) ?? '';
  if (titulo.length < 3 || titulo.length > 100) {
    return 'O título deve ter entre 3 e 100 caracteres.';
  }

  const descricao = lerTexto(corpo.descricao) ?? '';
  if (descricao.length === 0 || descricao.length > 2000) {
    return 'Descreva a atividade em até 2000 caracteres.';
  }

  const foto = lerTexto(corpo.foto) ?? null;
  if (foto !== null && (foto.length > 500 || !/^https?:\/\//i.test(foto))) {
    return 'A foto deve ser um endereço http(s) de até 500 caracteres.';
  }

  return { titulo, descricao, foto };
}

function apresentar(atividade: Atividade) {
  return {
    id: atividade.id,
    projetoId: atividade.projetoId,
    autorId: atividade.autorId,
    titulo: atividade.titulo,
    descricao: atividade.descricao,
    fotoUrl: atividade.fotoUrl,
    publicadaEm: atividade.publicadaEm
  };
}
