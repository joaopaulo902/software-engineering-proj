import { Request, Response, NextFunction } from 'express';
import { VagaService } from '../../dominio/servicos/VagaService';
import { DadosNovaVaga, Vaga } from '../../dominio/entidades/Vaga';
import { lerDia } from '../../dominio/calendario';

const TURNOS = ['Manhã', 'Tarde', 'Noite'];
const MODALIDADES = ['Presencial', 'Remoto', 'Híbrido'];

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

  /** GET /api/projetos/meus - C06, popula o formulario de publicacao */
  listarProjetosParaPublicar = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const projetos = await this.servico.projetosParaPublicar(req.session.usuarioId as number);
      res.json(
        projetos.map((p) => ({ id: p.id, nome: p.nome, area: p.area }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  /**
   * POST /api/vagas - C06
   *
   * Aqui so se confere se o pedido esta BEM FORMADO: campos presentes, numeros
   * inteiros dentro de faixas razoaveis, data que existe. O que depende do
   * estado do sistema — quem e o usuario, se o projeto e dele, se a data ja
   * passou — e regra de negocio, e quem decide e o VagaService.
   */
  publicar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leitura = lerNovaVaga(req.body ?? {});
      if (typeof leitura === 'string') {
        res.status(400).json({ erro: leitura });
        return;
      }

      const vaga = await this.servico.publicar(req.session.usuarioId as number, leitura);
      res.status(201).json(apresentar(vaga));
    } catch (erro) {
      next(erro);
    }
  };
}

/** Le o corpo do pedido. Devolve os dados prontos, ou o texto do primeiro problema. */
function lerNovaVaga(corpo: any): DadosNovaVaga | string {
  const projetoId = Number(corpo.projetoId);
  if (!inteiroEntre(projetoId, 1, Number.MAX_SAFE_INTEGER)) {
    return 'Escolha o projeto da vaga.';
  }

  const titulo = texto(corpo.titulo);
  if (titulo.length < 3 || titulo.length > 100) {
    return 'O título deve ter entre 3 e 100 caracteres.';
  }

  const requisitos = texto(corpo.requisitos);
  if (requisitos.length === 0 || requisitos.length > 500) {
    return 'Descreva os requisitos em até 500 caracteres.';
  }

  const cargaHoraria = Number(corpo.cargaHoraria);
  if (!inteiroEntre(cargaHoraria, 1, 40)) {
    return 'A carga horária deve ser de 1 a 40 horas semanais.';
  }

  const turno = texto(corpo.turno);
  if (!TURNOS.includes(turno)) {
    return 'Escolha o turno: Manhã, Tarde ou Noite.';
  }

  const modalidade = texto(corpo.modalidade);
  if (!MODALIDADES.includes(modalidade)) {
    return 'Escolha a modalidade: Presencial, Remoto ou Híbrido.';
  }

  const semestreMinimo = Number(corpo.semestreMinimo);
  if (!inteiroEntre(semestreMinimo, 1, 20)) {
    return 'O semestre mínimo deve ser de 1 a 20.';
  }

  const vagasTotais = Number(corpo.vagasTotais);
  if (!inteiroEntre(vagasTotais, 1, 100)) {
    return 'O número de posições deve ser de 1 a 100.';
  }

  const dataEncerramento = lerDia(texto(corpo.dataEncerramento));
  if (!dataEncerramento) {
    return 'Informe uma data de encerramento válida.';
  }

  return {
    projetoId,
    titulo,
    requisitos,
    cargaHoraria,
    turno,
    modalidade,
    semestreMinimo,
    vagasTotais,
    dataEncerramento
  };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function inteiroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

function apresentar(vaga: Vaga) {
  return {
    id: vaga.id,
    projetoId: vaga.projetoId,
    titulo: vaga.titulo,
    requisitos: vaga.requisitos,
    cargaHoraria: vaga.cargaHoraria,
    turno: vaga.turno,
    modalidade: vaga.modalidade,
    semestreMinimo: vaga.semestreMinimo,
    vagasTotais: vaga.vagasTotais,
    vagasRestantes: vaga.vagasRestantes,
    dataEncerramento: vaga.dataEncerramento,
    aberta: vaga.estaAberta()
  };
}
