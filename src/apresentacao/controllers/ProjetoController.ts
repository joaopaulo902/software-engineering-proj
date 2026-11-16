import { Request, Response, NextFunction } from 'express';
import { ProjetoService } from '../../dominio/servicos/ProjetoService';
import { Projeto } from '../../dominio/entidades/Projeto';
import { VagaComProjeto } from '../../persistencia/interfaces/IVagaRepository';
import { AtividadeComProjeto } from '../../persistencia/interfaces/IAtividadeRepository';
import { lerId, lerLista, lerTexto } from '../parametros';

export class ProjetoController {
  constructor(private readonly servico: ProjetoService) {}

  /** GET /api/projetos?termo=&areas=&somenteComVagasAbertas=true - tela Projetos */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lista = await this.servico.listar({
        termo: lerTexto(req.query.termo),
        areas: lerLista(req.query.areas),
        somenteComVagasAbertas: req.query.somenteComVagasAbertas === 'true'
      });
      res.json(
        lista.map((item) => ({
          ...apresentarProjeto(item.projeto),
          coordenadorNome: item.coordenadorNome,
          vagasAbertas: item.vagasAbertas
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /api/projetos/:id - C02 */
  detalhar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projetoId = lerId(req.params.id);
      if (!projetoId) {
        res.status(400).json({ erro: 'Projeto inválido.' });
        return;
      }

      const detalhe = await this.servico.detalhar(projetoId);
      res.json({
        ...apresentarProjeto(detalhe.projeto),
        coordenadorNome: detalhe.coordenadorNome,
        vagas: detalhe.vagas.map(apresentarVaga),
        atividades: detalhe.atividades.map(apresentarAtividade)
      });
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /api/participacoes/minhas - Meus Projetos */
  meusProjetos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lista = await this.servico.meusProjetos(req.session.usuarioId as number);
      res.json(
        lista.map((item) => ({
          participacaoId: item.participacao?.id ?? null,
          projetoId: item.projetoId,
          projetoNome: item.projetoNome,
          projetoArea: item.projetoArea,
          projetoIcone: item.projetoIcone,
          cargo: item.cargo,
          coordenador: item.participacao === null,
          ativa: item.participacao ? item.participacao.estaAtiva() : true,
          inicio: item.participacao?.inicio ?? null,
          fim: item.participacao?.fim ?? null
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /api/projetos/:id/participantes */
  listarParticipantes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projetoId = lerId(req.params.id);
      if (!projetoId) {
        res.status(400).json({ erro: 'Projeto inválido.' });
        return;
      }

      const lista = await this.servico.listarParticipantes(projetoId);
      res.json(
        lista.map((item) => ({
          participacaoId: item.participacao.id,
          usuarioId: item.participacao.usuarioId,
          nome: item.nome,
          cargo: item.participacao.cargo,
          inicio: item.participacao.inicio,
          previstoAte: item.participacao.previstoAte
        }))
      );
    } catch (erro) {
      next(erro);
    }
  };

  /** PATCH /api/participacoes/:id  { cargo } */
  alterarCargo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const participacaoId = lerId(req.params.id);
      if (!participacaoId) {
        res.status(400).json({ erro: 'Participação inválida.' });
        return;
      }
      const cargo = lerTexto(req.body?.cargo) ?? '';
      if (cargo.length < 2 || cargo.length > 50) {
        res.status(400).json({ erro: 'O cargo deve ter entre 2 e 50 caracteres.' });
        return;
      }

      await this.servico.alterarCargo(req.session.usuarioId as number, participacaoId, cargo);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  };

  /** DELETE /api/participacoes/:id */
  removerParticipante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const participacaoId = lerId(req.params.id);
      if (!participacaoId) {
        res.status(400).json({ erro: 'Participação inválida.' });
        return;
      }

      await this.servico.removerParticipante(req.session.usuarioId as number, participacaoId);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  };
}

function apresentarProjeto(projeto: Projeto) {
  return {
    id: projeto.id,
    nome: projeto.nome,
    descricao: projeto.descricao,
    area: projeto.area,
    icone: projeto.icone,
    situacao: projeto.situacao,
    coordenadorId: projeto.coordenadorId,
    coordenadorCadastrado: projeto.coordenadorCadastrado,
    incorporado: projeto.estaIncorporado()
  };
}

/** Mesmo formato do card de vaga do GET /api/vagas, para o front reaproveitar. */
function apresentarVaga(item: VagaComProjeto) {
  return {
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
  };
}

export function apresentarAtividade(item: AtividadeComProjeto) {
  return {
    id: item.atividade.id,
    projetoId: item.atividade.projetoId,
    projetoNome: item.projetoNome,
    projetoArea: item.projetoArea,
    autorId: item.atividade.autorId,
    autorNome: item.autorNome,
    titulo: item.atividade.titulo,
    descricao: item.atividade.descricao,
    fotoUrl: item.atividade.fotoUrl,
    publicadaEm: item.atividade.publicadaEm
  };
}
