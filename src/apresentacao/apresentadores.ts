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
