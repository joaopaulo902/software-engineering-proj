import { Vaga } from '../dominio/entidades/Vaga';
import { VagaComProjeto } from '../persistencia/interfaces/IVagaRepository';
import { AtividadeComProjeto } from '../persistencia/interfaces/IAtividadeRepository';

/**
 * Formatos JSON compartilhados entre controllers.
 *
 * Um mesmo item aparece em mais de uma tela (o card de vaga na busca e na
 * Pagina do Projeto; a atividade no feed e na Pagina do Projeto). O formato
 * mora aqui para as telas receberem sempre os mesmos campos: quem acrescentar
 * um campo muda num lugar so.
 */

/** Card de vaga: GET /api/vagas e GET /api/projetos/:id. */
export function apresentarVagaComProjeto(item: VagaComProjeto) {
  return {
    ...apresentarVaga(item.vaga),
    projetoNome: item.projetoNome,
    projetoArea: item.projetoArea,
    coordenadorNome: item.coordenadorNome,
    coordenadorId: item.coordenadorId
  };
}

/** Vaga sem os dados do projeto: resposta do POST /api/vagas (C06). */
export function apresentarVaga(vaga: Vaga) {
  return {
    id: vaga.id,
    projetoId: vaga.projetoId,
    titulo: vaga.titulo,
    descricao: vaga.descricao,
    requisitos: vaga.requisitos,
    areasTematicas: vaga.areasTematicas,
    cursosAceitos: vaga.cursosAceitos,
    cargaHoraria: vaga.cargaHoraria,
    turno: vaga.turno,
    modalidade: vaga.modalidade,
    beneficio: vaga.beneficio,
    duracaoEmMeses: vaga.duracaoEmMeses,
    semestreMinimo: vaga.semestreMinimo,
    vagasRestantes: vaga.vagasRestantes,
    vagasTotais: vaga.vagasTotais,
    dataEncerramento: vaga.dataEncerramento,
    publicadaEm: vaga.publicadaEm,
    aberta: vaga.estaAberta()
  };
}

/** Atividade: GET /api/atividades e GET /api/projetos/:id. */
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
