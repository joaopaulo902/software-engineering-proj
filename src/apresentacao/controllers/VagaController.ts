import { Request, Response, NextFunction } from 'express';
import { VagaService } from '../../dominio/servicos/VagaService';

export class VagaController {
  constructor(private readonly servico: VagaService) {}

  /** GET /api/vagas?termo=...&area=... - C01 */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const termo = typeof req.query.termo === 'string' ? req.query.termo : undefined;
      const area = typeof req.query.area === 'string' ? req.query.area : undefined;

      const lista = await this.servico.listarAbertas(termo, area);

      res.json(
        lista.map((item) => ({
          id: item.vaga.id,
          titulo: item.vaga.titulo,
          requisitos: item.vaga.requisitos,
          cargaHoraria: item.vaga.cargaHoraria,
          turno: item.vaga.turno,
          modalidade: item.vaga.modalidade,
          semestreMinimo: item.vaga.semestreMinimo,
          vagasRestantes: item.vaga.vagasRestantes,
          vagasTotais: item.vaga.vagasTotais,
          dataEncerramento: item.vaga.dataEncerramento,
          aberta: item.vaga.estaAberta(),
          projetoNome: item.projetoNome,
          projetoArea: item.projetoArea,
          coordenadorNome: item.coordenadorNome
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };
}
