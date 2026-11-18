import { Router } from 'express';
import { exigirLogin } from '../middlewares/exigirLogin';
import { CandidaturaController } from '../controllers/CandidaturaController';
import { VagaController } from '../controllers/VagaController';
import { SessaoController } from '../controllers/SessaoController';
import { ProjetoController } from '../controllers/ProjetoController';
import { AtividadeController } from '../controllers/AtividadeController';
import { NotificacaoController } from '../controllers/NotificacaoController';
import { IncorporacaoController } from '../controllers/IncorporacaoController';

/** Todos os controllers, montados no main.ts. Cada frente acrescenta o seu aqui. */
export interface Controllers {
  sessao: SessaoController;
  vaga: VagaController;
  candidatura: CandidaturaController;
  projeto: ProjetoController;
  atividade: AtividadeController;
  notificacao: NotificacaoController;
  incorporacao: IncorporacaoController;
}

/**
 * A tabela de rotas: para cada metodo + caminho, qual funcao chamar.
 *
 * E so isso que o Express faz no projeto inteiro. Nenhuma logica aqui.
 * As rotas fixas (/minhas, /meus) vem antes das rotas com :id; senao o
 * Express le "meus" como se fosse um id.
 */
export function criarRotas(c: Controllers): Router {
  const rotas = Router();

  // sessao
  rotas.get('/usuarios', c.sessao.listarUsuarios);
  rotas.post('/sessao', c.sessao.entrar);
  rotas.get('/sessao', c.sessao.atual);
  rotas.delete('/sessao', c.sessao.sair);

  // C01 - consultar e filtrar vagas
  rotas.get('/vagas', exigirLogin, c.vaga.listar);

  // C03 - visualizar detalhes da vaga
  rotas.get('/vagas/:id', exigirLogin, c.vaga.detalhar);

  // C06 - publicar vaga de projeto
  rotas.get('/projetos/meus', exigirLogin, c.vaga.listarProjetosParaPublicar);
  rotas.post('/vagas', exigirLogin, c.vaga.publicar);

  // Candidaturas (dupla A). As rotas fixas /minhas e /recebidas vem antes de /:id.
  // C04 - candidatar-se / C05 - acompanhar
  rotas.post('/candidaturas', exigirLogin, c.candidatura.criar);
  rotas.get('/candidaturas/minhas', exigirLogin, c.candidatura.listarMinhas);
  // C15 - visualizar candidaturas dos aplicantes
  rotas.get('/candidaturas/recebidas', exigirLogin, c.candidatura.listarRecebidas);
  rotas.get('/candidaturas/recebidas/:id', exigirLogin, c.candidatura.detalharRecebida);
  // C05 - minha candidatura / C18 - remover
  rotas.get('/candidaturas/:id', exigirLogin, c.candidatura.detalhar);
  rotas.delete('/candidaturas/:id', exigirLogin, c.candidatura.remover);
  // C07 - confirmar ou declinar o ingresso
  rotas.post('/candidaturas/:id/confirmacao', exigirLogin, c.candidatura.confirmar);
  rotas.post('/candidaturas/:id/declinio', exigirLogin, c.candidatura.declinar);
  // C11 - avaliar candidatura
  rotas.post('/candidaturas/:id/avaliacao', exigirLogin, c.candidatura.avaliar);

  // Projetos, C02 - visualizar detalhes do projeto, participantes
  rotas.get('/projetos', exigirLogin, c.projeto.listar);
  rotas.get('/projetos/:id', exigirLogin, c.projeto.detalhar);
  rotas.get('/projetos/:id/participantes', exigirLogin, c.projeto.listarParticipantes);

  // Meus Projetos e gestao da equipe
  rotas.get('/participacoes/minhas', exigirLogin, c.projeto.meusProjetos);
  rotas.patch('/participacoes/:id', exigirLogin, c.projeto.alterarCargo);
  rotas.delete('/participacoes/:id', exigirLogin, c.projeto.removerParticipante);

  // C10 - postar atividade do projeto, e o feed
  rotas.get('/atividades', exigirLogin, c.atividade.listar);
  rotas.post('/projetos/:id/atividades', exigirLogin, c.atividade.postar);

  // Notificacoes e contador do sino
  rotas.get('/notificacoes', exigirLogin, c.notificacao.listar);
  rotas.post('/notificacoes/lidas', exigirLogin, c.notificacao.marcarLidas);

  // C17 - solicitar incorporação (coordenador) e avaliar (administrador).
  rotas.get('/base-institucional/projetos', exigirLogin, c.incorporacao.listarProjetosDisponiveis);
  rotas.post('/incorporacoes', exigirLogin, c.incorporacao.solicitar);
  rotas.get('/incorporacoes/minhas', exigirLogin, c.incorporacao.listarMinhasPendentes);
  rotas.get('/incorporacoes/pendentes', exigirLogin, c.incorporacao.listarPendentes);
  rotas.post('/incorporacoes/:id/avaliacao', exigirLogin, c.incorporacao.avaliar);

  return rotas;
}
