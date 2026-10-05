import path from 'path';
import express from 'express';
import session from 'express-session';

// persistencia
import { criarPool, UnidadeDeTrabalho } from './persistencia/infra/Banco';
import { criarBancoEmMemoria } from './persistencia/infra/BancoEmMemoria';
import { IUnidadeDeTrabalho, Transacao } from './persistencia/interfaces/IUnidadeDeTrabalho';
import { VagaRepository } from './persistencia/repositorios/VagaRepository';
import { CandidaturaRepository } from './persistencia/repositorios/CandidaturaRepository';
import { UsuarioRepository } from './persistencia/repositorios/UsuarioRepository';

// dominio
import { CandidaturaService } from './dominio/servicos/CandidaturaService';
import { VagaService } from './dominio/servicos/VagaService';

// apresentacao
import { CandidaturaController } from './apresentacao/controllers/CandidaturaController';
import { VagaController } from './apresentacao/controllers/VagaController';
import { SessaoController } from './apresentacao/controllers/SessaoController';
import { criarRotas } from './apresentacao/routes';
import { tratadorDeErros } from './apresentacao/middlewares/tratadorDeErros';

/**
 * Raiz de composicao.
 *
 * Este e o unico arquivo que conhece as classes CONCRETAS de todas as
 * camadas. Ele monta o sistema de baixo para cima e injeta cada dependencia
 * pelo construtor. Em todos os outros arquivos as camadas se enxergam apenas
 * pelas interfaces.
 */
async function principal(): Promise<void> {
  // --- camada de persistencia -------------------------------------------
  let executor: Transacao;
  let unidadeDeTrabalho: IUnidadeDeTrabalho;

  if (process.env.BANCO === 'memoria') {
    const banco = await criarBancoEmMemoria();
    executor = banco.executor;
    unidadeDeTrabalho = banco.unidade;
    console.log('\nBanco em memoria (PGlite). Os dados somem quando o servidor parar.');
  } else {
    const pool = criarPool();
    try {
      await pool.query('SELECT 1');
    } catch {
      console.error(
        '\nNao consegui falar com o PostgreSQL.\n' +
          '  Com Docker:            npm run db:up\n' +
          '  Sem instalar nada:     npm run dev:memoria\n'
      );
      process.exit(1);
    }
    executor = pool as unknown as Transacao;
    unidadeDeTrabalho = new UnidadeDeTrabalho(pool);
  }

  const vagaRepository = new VagaRepository(executor);
  const candidaturaRepository = new CandidaturaRepository(executor);
  const usuarioRepository = new UsuarioRepository(executor);

  // --- camada de dominio -------------------------------------------------
  const candidaturaService = new CandidaturaService(
    unidadeDeTrabalho,
    candidaturaRepository,
    vagaRepository,
    usuarioRepository
  );
  const vagaService = new VagaService(vagaRepository);

  // --- camada de apresentacao -------------------------------------------
  const sessaoController = new SessaoController(usuarioRepository);
  const vagaController = new VagaController(vagaService);
  const candidaturaController = new CandidaturaController(candidaturaService);

  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'demonstracao-etapa-2',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' }
    })
  );

  app.use('/api', criarRotas(sessaoController, vagaController, candidaturaController));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(tratadorDeErros);

  const porta = Number(process.env.PORT ?? 3000);
  app.listen(porta, () => {
    console.log(`\nSistema no ar em http://localhost:${porta}\n`);
  });
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
