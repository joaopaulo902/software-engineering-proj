/**
 * Verificacao automatica do C04 - Candidatar-se a Vaga de Extensao.
 *
 * Roda o CandidaturaService de verdade contra um PostgreSQL em memoria e
 * confere cada regra de negocio e cada fluxo alternativo. Nenhum servidor
 * HTTP sobe aqui: e exatamente o beneficio de a regra de negocio nao conhecer
 * HTTP nem SQL.
 *
 *   npm run verificar
 */
import { criarBancoEmMemoria } from './persistencia/infra/BancoEmMemoria';
import { VagaRepository } from './persistencia/repositorios/VagaRepository';
import { CandidaturaRepository } from './persistencia/repositorios/CandidaturaRepository';
import { UsuarioRepository } from './persistencia/repositorios/UsuarioRepository';
import { CandidaturaService } from './dominio/servicos/CandidaturaService';
import { NaoEncontrado, RegraDeNegocio, SemPermissao } from './dominio/erros';

// ids vindos do seed
const ADMIN = 1, COORDENADORA = 2;
const ANA = 4, BRUNO = 5, CARLA_DIAS = 6, DIEGO = 7;
const MONITORIA = 1, DEV_WEB = 2, OFICINA_DADOS = 3, ELETRONICA = 4, COMUNICACAO = 5;

let passou = 0;
let falhou = 0;

function conferir(titulo: string, condicao: boolean, detalhe = ''): void {
  if (condicao) {
    passou++;
    console.log(`  ok    ${titulo}`);
  } else {
    falhou++;
    console.log(`  FALHA ${titulo}${detalhe ? ' -> ' + detalhe : ''}`);
  }
}

async function esperaErro(
  titulo: string,
  tipo: Function,
  trecho: string,
  acao: () => Promise<unknown>
): Promise<void> {
  try {
    await acao();
    conferir(titulo, false, 'nao lancou erro nenhum');
  } catch (erro) {
    const e = erro as Error;
    const tipoCerto = e instanceof (tipo as any);
    const mensagemCerta = e.message.toLowerCase().includes(trecho.toLowerCase());
    conferir(titulo, tipoCerto && mensagemCerta, `${e.name}: ${e.message}`);
  }
}

async function principal(): Promise<void> {
  const banco = await criarBancoEmMemoria();

  const vagas = new VagaRepository(banco.executor);
  const candidaturas = new CandidaturaRepository(banco.executor);
  const usuarios = new UsuarioRepository(banco.executor);
  const servico = new CandidaturaService(banco.unidade, candidaturas, vagas, usuarios);

  console.log('\nC04 - Candidatar-se a Vaga de Extensao\n');

  console.log('Fluxo basico');
  const antesDevWeb = (await vagas.buscarPorId(DEV_WEB))!.vagasRestantes;
  const candidatura = await servico.candidatar(DIEGO, DEV_WEB, 'Tenho experiencia com React.');
  conferir('candidatura registrada', candidatura.id > 0);
  conferir('status inicial Em Analise', candidatura.estaEmAnalise(), candidatura.status);
  const depoisDevWeb = (await vagas.buscarPorId(DEV_WEB))!.vagasRestantes;
  conferir(
    'posicao reservada na vaga',
    depoisDevWeb === antesDevWeb - 1,
    `antes ${antesDevWeb}, depois ${depoisDevWeb}`
  );

  console.log('\nFluxos alternativos');
  await esperaErro(
    'semestre abaixo do minimo',
    RegraDeNegocio,
    'semestre',
    () => servico.candidatar(BRUNO, OFICINA_DADOS, null)
  );
  await esperaErro(
    'prazo de inscricao encerrado',
    RegraDeNegocio,
    'prazo',
    () => servico.candidatar(CARLA_DIAS, ELETRONICA, null)
  );
  await esperaErro(
    'candidatura repetida',
    RegraDeNegocio,
    'já se candidatou',
    () => servico.candidatar(ANA, MONITORIA, null)
  );
  await esperaErro(
    'vaga sem posicao disponivel',
    RegraDeNegocio,
    'posições disponíveis',
    () => servico.candidatar(CARLA_DIAS, DEV_WEB, null)
  );
  await esperaErro(
    'coordenador nao pode se candidatar',
    SemPermissao,
    'apenas estudantes',
    () => servico.candidatar(COORDENADORA, COMUNICACAO, null)
  );
  await esperaErro(
    'administrador nao pode se candidatar',
    SemPermissao,
    'apenas estudantes',
    () => servico.candidatar(ADMIN, COMUNICACAO, null)
  );
  await esperaErro(
    'vaga inexistente',
    NaoEncontrado,
    'vaga não encontrada',
    () => servico.candidatar(DIEGO, 999, null)
  );

  console.log('\nAtomicidade da transacao');
  const antesOficina = (await vagas.buscarPorId(OFICINA_DADOS))!.vagasRestantes;
  try {
    await servico.candidatar(BRUNO, OFICINA_DADOS, null);
  } catch {
    /* esperado: semestre abaixo do minimo */
  }
  const depoisOficina = (await vagas.buscarPorId(OFICINA_DADOS))!.vagasRestantes;
  conferir(
    'candidatura recusada nao desconta posicao',
    antesOficina === depoisOficina,
    `antes ${antesOficina}, depois ${depoisOficina}`
  );
  const semCandidatura = !(await candidaturas.existe(BRUNO, OFICINA_DADOS));
  conferir('candidatura recusada nao fica gravada', semCandidatura);

  console.log('\nC05 - Acompanhar status');
  const minhas = await servico.listarDoEstudante(DIEGO);
  conferir('estudante ve a propria candidatura', minhas.length === 1, `${minhas.length} encontradas`);
  conferir(
    'candidatura traz o nome da vaga',
    minhas[0]?.vagaTitulo === 'Desenvolvimento Web',
    minhas[0]?.vagaTitulo
  );

  await banco.encerrar();

  console.log(`\n${passou} verificacoes passaram, ${falhou} falharam\n`);
  process.exit(falhou === 0 ? 0 : 1);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
