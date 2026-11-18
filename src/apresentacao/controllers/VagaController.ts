import { Request, Response, NextFunction } from 'express';
import {
  CRITERIOS_DE_ORDENACAO,
  CriterioDeOrdenacao,
  FiltroDeVagas,
  VagaService
} from '../../dominio/servicos/VagaService';
import { MAIOR_ID, lerId, lerLista, lerTexto } from '../parametros';
import { DadosNovaVaga } from '../../dominio/entidades/Vaga';
import { lerDia } from '../../dominio/calendario';
import { apresentarVaga, apresentarVagaComProjeto } from '../apresentadores';

const TURNOS = ['Manhã', 'Tarde', 'Noite'];
const MODALIDADES = ['Presencial', 'Remoto', 'Híbrido'];
/** O primeiro e o padrao. Os mesmos valores aceitos pelo banco. */
const BENEFICIOS = ['Horas de extensão', 'Bolsa'];

export class VagaController {
  constructor(private readonly servico: VagaService) {}

  /**
   * GET /api/vagas - C01
   *   ?termo=robotica
   *   &areas=Saude,Educacao          (tambem ?areas=Saude&areas=Educacao; ?area= continua valendo)
   *   &turnos=Manhã,Tarde
   *   &modalidades=Remoto
   *   &cargaHorariaMaxima=10
   *   &ordenarPor=PRAZO | PUBLICACAO | CARGA_HORARIA
   */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtro = lerFiltroDeVagas(req.query);
      if (typeof filtro === 'string') {
        res.status(400).json({ erro: filtro });
        return;
      }

      const lista = await this.servico.listarAbertas(filtro);

      res.json(lista.map(apresentarVagaComProjeto));
    } catch (erro) {
      next(erro);
    }
  };

  /**
   * GET /api/vagas/:id - C03
   * O card da vaga, mais `podeSeCandidatar` e `motivoDeInelegibilidade` para
   * quem esta logado.
   */
  detalhar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vagaId = lerId(req.params.id);
      if (!vagaId) {
        res.status(400).json({ erro: 'Vaga inválida.' });
        return;
      }

      const detalhe = await this.servico.detalhar(vagaId, req.session.usuarioId as number);
      res.json({
        ...apresentarVagaComProjeto(detalhe.vaga),
        podeSeCandidatar: detalhe.motivoDeInelegibilidade === null,
        motivoDeInelegibilidade: detalhe.motivoDeInelegibilidade
      });
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
      res.status(201).json(apresentarVaga(vaga));
    } catch (erro) {
      next(erro);
    }
  };
}

/** Le os filtros do C01. Devolve o filtro pronto, ou o texto do primeiro problema. */
function lerFiltroDeVagas(query: Request['query']): FiltroDeVagas | string {
  const turnos = lerLista(query.turnos);
  const turnoInvalido = turnos.find((t) => !TURNOS.includes(t));
  if (turnoInvalido) {
    return `Turno desconhecido: ${turnoInvalido}. Use Manhã, Tarde ou Noite.`;
  }

  const modalidades = lerLista(query.modalidades);
  const modalidadeInvalida = modalidades.find((m) => !MODALIDADES.includes(m));
  if (modalidadeInvalida) {
    return `Modalidade desconhecida: ${modalidadeInvalida}. Use Presencial, Remoto ou Híbrido.`;
  }

  let cargaHorariaMaxima: number | undefined;
  const carga = lerTexto(query.cargaHorariaMaxima);
  if (carga !== undefined) {
    cargaHorariaMaxima = Number(carga);
    if (!inteiroEntre(cargaHorariaMaxima, 1, 40)) {
      return 'A carga horária máxima deve ser de 1 a 40 horas semanais.';
    }
  }

  const ordenarPor = lerTexto(query.ordenarPor);
  if (ordenarPor !== undefined && !CRITERIOS_DE_ORDENACAO.includes(ordenarPor as CriterioDeOrdenacao)) {
    return 'Ordene por PRAZO, PUBLICACAO ou CARGA_HORARIA.';
  }

  return {
    termo: lerTexto(query.termo),
    // `area` (uma so) e o que a tela de Vagas abertas manda hoje.
    areas: [...lerLista(query.areas), ...lerLista(query.area)],
    turnos,
    modalidades,
    cargaHorariaMaxima,
    ordenarPor: ordenarPor as CriterioDeOrdenacao | undefined
  };
}

/** Le o corpo do pedido. Devolve os dados prontos, ou o texto do primeiro problema. */
function lerNovaVaga(corpo: any): DadosNovaVaga | string {
  // O PostgreSQL nao grava o caractere NUL em texto: recusaria com erro 500.
  // (o JSON.stringify escreve esse caractere como o texto \u0000)
  if (JSON.stringify(corpo).includes('\\u0000')) {
    return 'O texto tem um caractere inválido.';
  }

  const projetoId = Number(corpo.projetoId);
  if (!inteiroEntre(projetoId, 1, MAIOR_ID)) {
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

  // Campos da Etapa 3. Todos opcionais, para o formulario antigo continuar
  // funcionando: quem nao manda recebe o valor padrao.
  const descricao = texto(corpo.descricao);
  if (descricao.length > 2000) {
    return 'A descrição deve ter até 2000 caracteres.';
  }

  const areasTematicas = listaDeTextos(corpo.areasTematicas);
  if (areasTematicas === null) {
    return 'Informe as áreas temáticas como uma lista de até 10 nomes.';
  }

  const cursosAceitos = listaDeTextos(corpo.cursosAceitos);
  if (cursosAceitos === null) {
    return 'Informe os cursos aceitos como uma lista de até 10 nomes.';
  }

  const beneficio = texto(corpo.beneficio) || BENEFICIOS[0];
  if (!BENEFICIOS.includes(beneficio)) {
    return 'Escolha o benefício: Horas de extensão ou Bolsa.';
  }

  let duracaoEmMeses: number | null = null;
  if (corpo.duracaoEmMeses !== undefined && corpo.duracaoEmMeses !== null && corpo.duracaoEmMeses !== '') {
    duracaoEmMeses = Number(corpo.duracaoEmMeses);
    if (!inteiroEntre(duracaoEmMeses, 1, 24)) {
      return 'A duração deve ser de 1 a 24 meses, ou ficar em branco.';
    }
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
    dataEncerramento,
    descricao,
    areasTematicas,
    cursosAceitos,
    beneficio,
    duracaoEmMeses
  };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Lista de nomes (areas, cursos). Ausente = lista vazia. Devolve null se o
 * valor nao for uma lista de textos de ate 60 caracteres, com no maximo 10.
 * Repetidos e itens em branco sao descartados.
 */
function listaDeTextos(valor: unknown): string[] | null {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor) || !valor.every((item) => typeof item === 'string')) return null;
  const itens = [...new Set(valor.map((item: string) => item.trim()).filter((item) => item))];
  if (itens.length > 10 || itens.some((item) => item.length > 60)) return null;
  return itens;
}

function inteiroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

