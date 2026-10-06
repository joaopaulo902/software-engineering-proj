import { Router } from 'express';
import { exigirLogin } from '../middlewares/exigirLogin';
import { CandidaturaController } from '../controllers/CandidaturaController';
import { VagaController } from '../controllers/VagaController';
import { SessaoController } from '../controllers/SessaoController';

/**
 * A tabela de rotas: para cada metodo + caminho, qual funcao chamar.
 *
 * E so isso que o Express faz no projeto inteiro. Nenhuma logica aqui.
 */
export function criarRotas(
  sessao: SessaoController,
  vaga: VagaController,
  candidatura: CandidaturaController
): Router {
  const rotas = Router();

  // sessao
  rotas.get('/usuarios', sessao.listarUsuarios);
  rotas.post('/sessao', sessao.entrar);
  rotas.get('/sessao', sessao.atual);
  rotas.delete('/sessao', sessao.sair);

  // C01 - consultar e filtrar vagas
  rotas.get('/vagas', exigirLogin, vaga.listar);

  // C06 - publicar vaga de projeto
  rotas.get('/projetos/meus', exigirLogin, vaga.listarProjetosParaPublicar);
  rotas.post('/vagas', exigirLogin, vaga.publicar);

  // C04 - candidatar-se / C05 - acompanhar
  rotas.post('/candidaturas', exigirLogin, candidatura.criar);
  rotas.get('/candidaturas/minhas', exigirLogin, candidatura.listarMinhas);

  return rotas;
}
