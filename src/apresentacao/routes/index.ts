import { Router } from 'express';
import { exigirLogin } from '../middlewares/exigirLogin';
import { CandidaturaController } from '../controllers/CandidaturaController';
import { VagaController } from '../controllers/VagaController';
import { SessaoController } from '../controllers/SessaoController';
import { ProjetoController } from '../controllers/ProjetoController';
import { AtividadeController } from '../controllers/AtividadeController';
import { NotificacaoController } from '../controllers/NotificacaoController';

/** Todos os controllers, montados no main.ts. Cada frente acrescenta o seu aqui. */
export interface Controllers {
  sessao: SessaoController;
  vaga: VagaController;
  candidatura: CandidaturaController;
  projeto: ProjetoController;
  atividade: AtividadeController;
  notificacao: NotificacaoController;
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

  // C06 - publicar vaga de projeto
  rotas.get('/projetos/meus', exigirLogin, c.vaga.listarProjetosParaPublicar);
  rotas.post('/vagas', exigirLogin, c.vaga.publicar);

  // C04 - candidatar-se / C05 - acompanhar
  rotas.post('/candidaturas', exigirLogin, c.candidatura.criar);
  rotas.get('/candidaturas/minhas', exigirLogin, c.candidatura.listarMinhas);

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

  return rotas;
}
