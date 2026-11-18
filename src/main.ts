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
import { ProjetoRepository } from './persistencia/repositorios/ProjetoRepository';
import { ParticipacaoRepository } from './persistencia/repositorios/ParticipacaoRepository';
import { AtividadeRepository } from './persistencia/repositorios/AtividadeRepository';
import { NotificacaoRepository } from './persistencia/repositorios/NotificacaoRepository';

// dominio
import { CandidaturaService } from './dominio/servicos/CandidaturaService';
import { VagaService } from './dominio/servicos/VagaService';
import { ProjetoService } from './dominio/servicos/ProjetoService';
import { AtividadeService } from './dominio/servicos/AtividadeService';
import { NotificacaoService } from './dominio/servicos/NotificacaoService';
import { PublicadorDeEventos } from './dominio/eventos/PublicadorDeEventos';
import { NotificadorInApp } from './dominio/eventos/NotificadorInApp';

// apresentacao
import { CandidaturaController } from './apresentacao/controllers/CandidaturaController';
import { VagaController } from './apresentacao/controllers/VagaController';
import { SessaoController } from './apresentacao/controllers/SessaoController';
import { ProjetoController } from './apresentacao/controllers/ProjetoController';
import { AtividadeController } from './apresentacao/controllers/AtividadeController';
import { NotificacaoController } from './apresentacao/controllers/NotificacaoController';
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
  const projetoRepository = new ProjetoRepository(executor);
  const participacaoRepository = new ParticipacaoRepository(executor);
  const atividadeRepository = new AtividadeRepository(executor);
  const notificacaoRepository = new NotificacaoRepository(executor);

  // --- camada de dominio -------------------------------------------------

  // Observer: os servicos publicam eventos; o NotificadorInApp grava os avisos.
  // Os servicos que publicam recebem `eventos` pelo construtor.
  const eventos = new PublicadorDeEventos();
  eventos.inscrever(
    new NotificadorInApp(
      notificacaoRepository,
      projetoRepository,
      participacaoRepository,
      atividadeRepository,
      usuarioRepository
    )
  );

  const candidaturaService = new CandidaturaService(
    unidadeDeTrabalho,
    candidaturaRepository,
    vagaRepository,
    usuarioRepository,
    participacaoRepository,
    eventos
  );
  const vagaService = new VagaService(
    unidadeDeTrabalho,
    vagaRepository,
    projetoRepository,
    usuarioRepository
  );
  const projetoService = new ProjetoService(
    unidadeDeTrabalho,
    projetoRepository,
    vagaRepository,
    atividadeRepository,
    participacaoRepository
  );
  const atividadeService = new AtividadeService(
    unidadeDeTrabalho,
    atividadeRepository,
    participacaoRepository,
    projetoRepository,
    eventos
  );
  const notificacaoService = new NotificacaoService(notificacaoRepository);

  // --- camada de apresentacao -------------------------------------------
  const controllers = {
    sessao: new SessaoController(usuarioRepository),
    vaga: new VagaController(vagaService),
    candidatura: new CandidaturaController(candidaturaService),
    projeto: new ProjetoController(projetoService),
    atividade: new AtividadeController(atividadeService),
    notificacao: new NotificacaoController(notificacaoService)
  };

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

  app.use('/api', criarRotas(controllers));
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
