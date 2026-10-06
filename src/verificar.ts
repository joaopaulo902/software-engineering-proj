/**
 * Verificacao automatica dos casos de uso implementados:
 *   C04 - Candidatar-se a Vaga de Extensao
 *   C05 - Acompanhar Status das Candidaturas
 *   C06 - Publicar Vaga de Projeto
 *
 * Roda os servicos de verdade contra um PostgreSQL em memoria e confere
 * cada regra de negocio e cada fluxo alternativo. Nenhum servidor
 * HTTP sobe aqui: e exatamente o beneficio de a regra de negocio nao conhecer
 * HTTP nem SQL.
 *
 *   npm run verificar
 */
import { criarBancoEmMemoria } from './persistencia/infra/BancoEmMemoria';
import { VagaRepository } from './persistencia/repositorios/VagaRepository';
import { CandidaturaRepository } from './persistencia/repositorios/CandidaturaRepository';
import { UsuarioRepository } from './persistencia/repositorios/UsuarioRepository';
import { ProjetoRepository } from './persistencia/repositorios/ProjetoRepository';
import { CandidaturaService } from './dominio/servicos/CandidaturaService';
import { VagaService } from './dominio/servicos/VagaService';
import { DadosNovaVaga, Vaga } from './dominio/entidades/Vaga';
import { hojeComoDia } from './dominio/calendario';
import { NaoEncontrado, RegraDeNegocio, SemPermissao } from './dominio/erros';

// ids vindos do seed
const ADMIN = 1, COORDENADORA = 2, COORDENADOR_RUI = 3;
const ROBOTICA = 1, SAUDE_DIGITAL = 2, DADOS_PARA_TODOS = 3;
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

/** Executa a acao e devolve o resultado, ou o erro, sem interromper o roteiro. */
async function tentar<T>(acao: () => Promise<T>): Promise<T | Error> {
  try {
    return await acao();
  } catch (erro) {
    return erro as Error;
  }
}

const UM_DIA = 24 * 60 * 60 * 1000;

/** Uma vaga valida para o C06; cada teste muda so o campo que interessa. */
function novaVaga(alteracoes: Partial<DadosNovaVaga> = {}): DadosNovaVaga {
  return {
    projetoId: ROBOTICA,
    titulo: 'Tutoria de Python',
    requisitos: 'Python básico, gosto por ensinar',
    cargaHoraria: 6,
    turno: 'Tarde',
    modalidade: 'Presencial',
    semestreMinimo: 1,
    vagasTotais: 2,
    dataEncerramento: new Date(hojeComoDia().getTime() + 30 * UM_DIA),
    ...alteracoes
  };
}

async function principal(): Promise<void> {
  const banco = await criarBancoEmMemoria();

  const vagas = new VagaRepository(banco.executor);
  const candidaturas = new CandidaturaRepository(banco.executor);
  const usuarios = new UsuarioRepository(banco.executor);
  const projetos = new ProjetoRepository(banco.executor);
  const servico = new CandidaturaService(banco.unidade, candidaturas, vagas, usuarios);
  const vagaService = new VagaService(banco.unidade, vagas, projetos, usuarios);

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

  console.log('\nC06 - Publicar Vaga de Projeto\n');

  console.log('Fluxo basico');
  const meusProjetos = await vagaService.projetosParaPublicar(COORDENADORA);
  conferir(
    'coordenadora ve so os projetos que coordena',
    meusProjetos.map((p) => p.id).sort().join(',') === `${ROBOTICA},${DADOS_PARA_TODOS}`,
    meusProjetos.map((p) => p.nome).join(', ')
  );
  const publicada = await vagaService.publicar(COORDENADORA, novaVaga());
  conferir('vaga gravada', publicada.id > 0);
  conferir(
    'nasce com todas as posicoes livres',
    publicada.vagasRestantes === publicada.vagasTotais,
    `${publicada.vagasRestantes} de ${publicada.vagasTotais}`
  );

  console.log('\nPos-condicoes: publicada no feed e aberta a candidaturas');
  const feed = await vagaService.listarAbertas();
  conferir('aparece no feed do C01', feed.some((item) => item.vaga.id === publicada.id));
  const busca = await vagaService.listarAbertas('tutoria');
  conferir('a busca do C01 encontra pelo titulo', busca.some((item) => item.vaga.id === publicada.id));
  const primeiraCandidatura = await servico.candidatar(BRUNO, publicada.id, null);
  conferir('estudante consegue se candidatar (C04)', primeiraCandidatura.id > 0);

  console.log('\nPrazo por dia de calendario');
  const hoje = new Date();
  const hojeAsOnzeEMeia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 30);
  const ultimoDia = Vaga.nova(novaVaga({ dataEncerramento: hojeComoDia() }));
  conferir('continua aberta as 23h30 do ultimo dia', ultimoDia.prazoAberto(hojeAsOnzeEMeia));
  const venceuOntem = Vaga.nova(novaVaga({ dataEncerramento: new Date(hojeComoDia().getTime() - UM_DIA) }));
  conferir('fecha no dia seguinte ao encerramento', !venceuOntem.prazoAberto(hoje));

  const encerraHoje = await tentar(() =>
    vagaService.publicar(
      COORDENADORA,
      novaVaga({ titulo: 'Plantão de Dúvidas', dataEncerramento: hojeComoDia() })
    )
  );
  const publicouHoje = !(encerraHoje instanceof Error);
  conferir(
    'vaga que encerra hoje pode ser publicada',
    publicouHoje,
    encerraHoje instanceof Error ? encerraHoje.message : ''
  );
  const feedDeHoje = await vagaService.listarAbertas();
  conferir(
    'vaga que encerra hoje aparece no feed',
    !(encerraHoje instanceof Error) && feedDeHoje.some((i) => i.vaga.id === encerraHoje.id)
  );

  console.log('\nFluxos alternativos');
  await esperaErro(
    'estudante nao pode publicar',
    SemPermissao,
    'apenas coordenadores',
    () => vagaService.publicar(ANA, novaVaga())
  );
  await esperaErro(
    'administrador nao pode publicar',
    SemPermissao,
    'apenas coordenadores',
    () => vagaService.publicar(ADMIN, novaVaga())
  );
  await esperaErro(
    'coordenador nao publica em projeto de outro',
    SemPermissao,
    'projetos que coordena',
    () => vagaService.publicar(COORDENADOR_RUI, novaVaga({ projetoId: ROBOTICA }))
  );
  await esperaErro(
    'projeto inexistente',
    NaoEncontrado,
    'projeto não encontrado',
    () => vagaService.publicar(COORDENADORA, novaVaga({ projetoId: 999 }))
  );
  await esperaErro(
    'data de encerramento no passado',
    RegraDeNegocio,
    'anterior a hoje',
    () =>
      vagaService.publicar(
        COORDENADORA,
        novaVaga({ dataEncerramento: new Date(hojeComoDia().getTime() - UM_DIA) })
      )
  );
  await esperaErro(
    'vaga sem nenhuma posicao',
    RegraDeNegocio,
    'pelo menos uma posição',
    () => vagaService.publicar(COORDENADORA, novaVaga({ vagasTotais: 0 }))
  );
  await esperaErro(
    'estudante nao recebe a lista de projetos',
    SemPermissao,
    'apenas coordenadores',
    () => vagaService.projetosParaPublicar(ANA)
  );

  console.log('\nAtomicidade da transacao');
  const vagasAntes = (await vagaService.listarAbertas()).length;
  try {
    await vagaService.publicar(COORDENADOR_RUI, novaVaga({ projetoId: ROBOTICA }));
  } catch {
    /* esperado: o projeto nao e dele */
  }
  const vagasDepois = (await vagaService.listarAbertas()).length;
  conferir(
    'publicacao recusada nao grava vaga',
    vagasAntes === vagasDepois,
    `antes ${vagasAntes}, depois ${vagasDepois}`
  );
  const vagaDoRui = await vagaService.publicar(COORDENADOR_RUI, novaVaga({ projetoId: SAUDE_DIGITAL }));
  conferir('o mesmo coordenador publica no projeto dele', vagaDoRui.id > 0);

  await banco.encerrar();

  console.log(`\n${passou} verificacoes passaram, ${falhou} falharam\n`);
  process.exit(falhou === 0 ? 0 : 1);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
