/**
 * Verificacao automatica dos casos de uso implementados:
 *   C04 - Candidatar-se a Vaga de Extensao
 *   C05 - Acompanhar Status das Candidaturas
 *   C06 - Publicar Vaga de Projeto
 *   Frente B: Observer e notificacoes, C02, Meus Projetos, participantes, C10
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
import { BancoEmMemoria } from './persistencia/infra/BancoEmMemoria';
import { ParticipacaoRepository } from './persistencia/repositorios/ParticipacaoRepository';
import { AtividadeRepository } from './persistencia/repositorios/AtividadeRepository';
import { NotificacaoRepository } from './persistencia/repositorios/NotificacaoRepository';
import { ProjetoService } from './dominio/servicos/ProjetoService';
import { AtividadeService } from './dominio/servicos/AtividadeService';
import { NotificacaoService } from './dominio/servicos/NotificacaoService';
import { PublicadorDeEventos } from './dominio/eventos/PublicadorDeEventos';
import { NotificadorInApp } from './dominio/eventos/NotificadorInApp';
import { evento } from './dominio/eventos/EventoDeDominio';
import { TipoNotificacao } from './dominio/entidades/Notificacao';
import { verificarFrenteC } from './verificacoes/frenteC';

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
    descricao: '',
    areasTematicas: [],
    cursosAceitos: [],
    beneficio: 'Horas de extensão',
    duracaoEmMeses: null,
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
  const semCandidatura = !(await candidaturas.existeNaoRemovida(BRUNO, OFICINA_DADOS));
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

  await verificarFrenteB(banco, candidatura.id, publicada.id);
  await verificarFrenteC(banco, { conferir, esperaErro, novaVaga });

  await banco.encerrar();

  console.log(`\n${passou} verificacoes passaram, ${falhou} falharam\n`);
  process.exit(falhou === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Frente B: projetos e avisos
//   Observer e notificacoes, C02 (projetos), Meus Projetos, participantes
//   e C10 (postar atividade)
// ---------------------------------------------------------------------------

/** ids da parte do seed da frente B */
const INCLUSAO_DIGITAL = 4; // projeto ainda nao incorporado
const PARTICIPACAO_CARLA_DIAS = 1; // Carla Dias, Monitora em Robotica

async function verificarFrenteB(
  banco: BancoEmMemoria,
  candidaturaDoDiegoId: number,
  vagaPublicadaId: number
): Promise<void> {
  const usuarios = new UsuarioRepository(banco.executor);
  const projetos = new ProjetoRepository(banco.executor);
  const vagas = new VagaRepository(banco.executor);
  const participacoes = new ParticipacaoRepository(banco.executor);
  const atividades = new AtividadeRepository(banco.executor);
  const notificacoes = new NotificacaoRepository(banco.executor);

  const eventos = new PublicadorDeEventos();
  eventos.inscrever(
    new NotificadorInApp(notificacoes, projetos, participacoes, atividades, usuarios)
  );

  const projetoService = new ProjetoService(banco.unidade, projetos, vagas, atividades, participacoes);
  const atividadeService = new AtividadeService(
    banco.unidade,
    atividades,
    participacoes,
    projetos,
    eventos
  );
  const notificacaoService = new NotificacaoService(notificacoes);

  /** Avisos de um tipo que o usuario tem agora. */
  const avisos = (usuarioId: number, tipo: TipoNotificacao) =>
    notificacaoService.listarDoUsuario(usuarioId, [tipo]);

  console.log('\nObserver - PublicadorDeEventos\n');

  const recebidos: string[] = [];
  const publicadorDeTeste = new PublicadorDeEventos();
  publicadorDeTeste.inscrever({ notificar: async (e) => void recebidos.push(`a:${e.tipo}`) });
  publicadorDeTeste.inscrever({
    notificar: async () => {
      throw new Error('observador com defeito');
    }
  });
  publicadorDeTeste.inscrever({ notificar: async (e) => void recebidos.push(`b:${e.tipo}`) });
  const errosDoConsole = console.error;
  console.error = () => {}; // o log do observador com defeito e esperado aqui
  const publicou = await tentar(() =>
    publicadorDeTeste.publicar(evento('ATIVIDADE_POSTADA', 1, null))
  );
  console.error = errosDoConsole;
  conferir('entrega o evento a todos os observadores', recebidos.join(',') === 'a:ATIVIDADE_POSTADA,b:ATIVIDADE_POSTADA', recebidos.join(','));
  conferir('observador com defeito nao derruba quem publica', !(publicou instanceof Error));

  console.log('\nNotificadorInApp - avisos das candidaturas (C04, C07, C11)');

  const antesRui = (await avisos(COORDENADOR_RUI, 'NOVA_CANDIDATURA')).length;
  await eventos.publicar(evento('CANDIDATURA_CRIADA', candidaturaDoDiegoId, DIEGO));
  const novasDoRui = await avisos(COORDENADOR_RUI, 'NOVA_CANDIDATURA');
  conferir(
    'nova candidatura avisa o coordenador do projeto',
    novasDoRui.length === antesRui + 1,
    `${antesRui} -> ${novasDoRui.length}`
  );
  conferir(
    'o aviso aponta para a candidatura e cita o estudante',
    novasDoRui[0]?.referenciaId === candidaturaDoDiegoId && novasDoRui[0].texto.includes('Diego Alves'),
    novasDoRui[0]?.texto
  );
  conferir(
    'o aviso nasce nao lido',
    novasDoRui[0]?.lida === false
  );
  conferir(
    'o autor nao e avisado do proprio ato',
    (await avisos(DIEGO, 'NOVA_CANDIDATURA')).length === 0
  );

  await eventos.publicar(evento('CANDIDATURA_AVALIADA', candidaturaDoDiegoId, COORDENADOR_RUI));
  conferir(
    'avaliacao da candidatura avisa o estudante',
    (await avisos(DIEGO, 'RESULTADO_DA_AVALIACAO')).length === 1
  );

  await eventos.publicar(evento('INGRESSO_CONFIRMADO', candidaturaDoDiegoId, DIEGO));
  conferir(
    'confirmacao de ingresso avisa o coordenador',
    (await avisos(COORDENADOR_RUI, 'CONFIRMACAO_DE_INGRESSO')).length === 1
  );

  await eventos.publicar(evento('INGRESSO_DECLINADO', candidaturaDoDiegoId, DIEGO));
  conferir(
    'declinio de ingresso avisa o coordenador',
    (await avisos(COORDENADOR_RUI, 'DECLINIO_DE_INGRESSO')).length === 1
  );

  const outraCoordenadoraAntes = (await notificacaoService.listarDoUsuario(COORDENADORA)).length;
  await eventos.publicar(evento('CANDIDATURA_CRIADA', 999, DIEGO));
  conferir(
    'candidatura inexistente nao gera aviso',
    (await notificacaoService.listarDoUsuario(COORDENADORA)).length === outraCoordenadoraAntes &&
      (await avisos(COORDENADOR_RUI, 'NOVA_CANDIDATURA')).length === novasDoRui.length
  );

  await eventos.publicar(evento('DENUNCIA_REGISTRADA', 1, COORDENADORA));
  conferir('nova denuncia avisa os administradores', (await avisos(ADMIN, 'NOVA_DENUNCIA')).length === 1);
  conferir(
    'nova denuncia nao avisa coordenadores',
    (await avisos(COORDENADOR_RUI, 'NOVA_DENUNCIA')).length === 0
  );

  console.log('\nNotificacoes - tela e contador do sino');

  const doRui = await notificacaoService.listarDoUsuario(COORDENADOR_RUI);
  conferir(
    'mais recentes primeiro',
    doRui.every((n, i) => i === 0 || doRui[i - 1].criadaEm.getTime() >= n.criadaEm.getTime())
  );
  conferir(
    'cada um so ve os proprios avisos',
    doRui.every((n) => n.destinatarioId === COORDENADOR_RUI)
  );
  const filtradas = await notificacaoService.listarDoUsuario(COORDENADOR_RUI, [
    'CONFIRMACAO_DE_INGRESSO',
    'DECLINIO_DE_INGRESSO'
  ]);
  conferir(
    'filtro por tipo',
    filtradas.length === 2 &&
      filtradas.every((n) => n.tipo === 'CONFIRMACAO_DE_INGRESSO' || n.tipo === 'DECLINIO_DE_INGRESSO'),
    `${filtradas.length} encontradas`
  );
  await notificacaoService.marcarComoLidas(COORDENADOR_RUI);
  conferir(
    'marcar como lidas zera o contador',
    (await notificacaoService.listarDoUsuario(COORDENADOR_RUI)).every((n) => n.lida)
  );
  conferir(
    'marcar como lidas nao mexe nos avisos de outro usuario',
    (await notificacaoService.listarDoUsuario(COORDENADORA)).some((n) => !n.lida)
  );

  console.log('\nProjetos e C02 - Visualizar Detalhes do Projeto');

  const todos = await projetoService.listar();
  conferir('lista todos os projetos', todos.length === 4, `${todos.length} projetos`);
  const naoIncorporado = todos.find((p) => p.projeto.id === INCLUSAO_DIGITAL);
  conferir(
    'projeto nao incorporado aparece sem coordenador no sistema',
    !!naoIncorporado && naoIncorporado.coordenadorNome === null && !naoIncorporado.projeto.estaIncorporado()
  );
  conferir(
    'projeto nao incorporado nao aceita vagas',
    !!naoIncorporado && !naoIncorporado.projeto.aceitaVagas()
  );
  conferir(
    'busca ignora acento',
    (await projetoService.listar({ termo: 'robotica' })).map((p) => p.projeto.id).join() === `${ROBOTICA}`
  );
  conferir(
    'busca pelo coordenador cadastrado',
    (await projetoService.listar({ termo: 'marcos' })).map((p) => p.projeto.id).join() === `${INCLUSAO_DIGITAL}`
  );
  conferir(
    'filtro por area',
    (await projetoService.listar({ areas: ['saude'] })).map((p) => p.projeto.id).join() === `${SAUDE_DIGITAL}`
  );
  const comVagas = await projetoService.listar({ somenteComVagasAbertas: true });
  conferir(
    'filtro so com vagas abertas',
    comVagas.length > 0 && comVagas.every((p) => p.vagasAbertas > 0) &&
      !comVagas.some((p) => p.projeto.id === INCLUSAO_DIGITAL)
  );
  const abertasDaRobotica = (await vagas.listarAbertas()).filter(
    (v) => v.vaga.projetoId === ROBOTICA && v.vaga.temPosicaoDisponivel()
  ).length;
  conferir(
    'conta as vagas abertas do projeto',
    todos.find((p) => p.projeto.id === ROBOTICA)?.vagasAbertas === abertasDaRobotica,
    `esperado ${abertasDaRobotica}`
  );

  const robotica = await projetoService.detalhar(ROBOTICA);
  conferir('detalhe traz o coordenador', robotica.coordenadorNome === 'Profa. Carla Menezes');
  conferir(
    'detalhe traz so as vagas do projeto',
    robotica.vagas.length > 0 && robotica.vagas.every((v) => v.vaga.projetoId === ROBOTICA)
  );
  conferir(
    'detalhe traz a vaga publicada no C06',
    robotica.vagas.some((v) => v.vaga.id === vagaPublicadaId)
  );
  const eletronica = robotica.vagas.findIndex((v) => v.vaga.id === ELETRONICA);
  conferir(
    'detalhe traz a vaga encerrada, marcada como fechada',
    eletronica >= 0 && !robotica.vagas[eletronica].vaga.estaAberta()
  );
  conferir(
    'vagas abertas vem antes das encerradas',
    robotica.vagas.slice(0, eletronica).every((v) => v.vaga.estaAberta()) &&
      robotica.vagas.slice(eletronica).every((v) => !v.vaga.estaAberta())
  );
  conferir(
    'detalhe conta as mesmas vagas abertas da listagem',
    robotica.vagas.filter((v) => v.vaga.estaAberta()).length === abertasDaRobotica
  );
  const inclusao = await projetoService.detalhar(INCLUSAO_DIGITAL);
  conferir(
    'detalhe de projeto nao incorporado: sem coordenador e sem vagas',
    inclusao.coordenadorNome === null && inclusao.vagas.length === 0
  );
  conferir(
    'detalhe traz as atividades, mais recente primeiro',
    robotica.atividades.length === 2 && robotica.atividades[0].atividade.titulo === 'Kit novo de sensores'
  );
  await esperaErro('projeto inexistente', NaoEncontrado, 'projeto não encontrado', () =>
    projetoService.detalhar(999)
  );

  console.log('\nMeus Projetos e participantes');

  const daCarlaDias = await projetoService.meusProjetos(CARLA_DIAS);
  conferir(
    'estudante ve o projeto em que participa, com o cargo',
    daCarlaDias.length === 1 && daCarlaDias[0].projetoId === ROBOTICA && daCarlaDias[0].cargo === 'Monitora'
  );
  const daCoordenadora = await projetoService.meusProjetos(COORDENADORA);
  conferir(
    'coordenadora ve os projetos que coordena',
    daCoordenadora.map((p) => p.projetoId).sort().join(',') === `${ROBOTICA},${DADOS_PARA_TODOS}` &&
      daCoordenadora.every((p) => p.participacao === null && p.cargo === 'Coordenador(a)')
  );
  conferir('quem nao participa de nada ve a lista vazia', (await projetoService.meusProjetos(BRUNO)).length === 0);

  const equipe = await projetoService.listarParticipantes(ROBOTICA);
  conferir('lista a equipe do projeto', equipe.map((p) => p.nome).join() === 'Carla Dias');
  await esperaErro('participantes de projeto inexistente', NaoEncontrado, 'projeto não encontrado', () =>
    projetoService.listarParticipantes(999)
  );

  console.log('\nC10 - Postar atividade do projeto\n');

  console.log('Fluxo basico');
  const ultimaDoFeed = (await atividadeService.listarRecentes())[0]?.atividade.id ?? 0;
  const daCoordenadoraPost = await atividadeService.postar(COORDENADORA, ROBOTICA, {
    titulo: 'Feira de ciências',
    descricao: 'Os robôs das oficinas foram apresentados na feira da escola.',
    foto: null
  });
  conferir('coordenadora posta no projeto dela', daCoordenadoraPost.id > ultimaDoFeed);
  const feed = await atividadeService.listarRecentes();
  conferir('atividade aparece no topo do feed', feed[0]?.atividade.id === daCoordenadoraPost.id);
  conferir(
    'atividade aparece na pagina do projeto',
    (await projetoService.detalhar(ROBOTICA)).atividades.some((a) => a.atividade.id === daCoordenadoraPost.id)
  );
  const avisoDaEquipe = await avisos(CARLA_DIAS, 'NOVA_ATIVIDADE');
  conferir(
    'a equipe e avisada, e o aviso abre o projeto',
    avisoDaEquipe.length === 1 && avisoDaEquipe[0].referenciaId === ROBOTICA,
    avisoDaEquipe[0]?.texto
  );
  conferir(
    'a autora nao e avisada da propria atividade',
    (await avisos(COORDENADORA, 'NOVA_ATIVIDADE')).length === 0
  );

  const daParticipante = await atividadeService.postar(CARLA_DIAS, ROBOTICA, {
    titulo: 'Relato da monitoria',
    descricao: 'Turma da tarde montou o primeiro carrinho sozinha.',
    foto: 'https://exemplo.org/foto.jpg'
  });
  conferir('participante da equipe tambem posta', daParticipante.id > 0 && daParticipante.fotoUrl !== null);
  conferir(
    'post da participante avisa a coordenadora',
    (await avisos(COORDENADORA, 'NOVA_ATIVIDADE')).length === 1
  );

  console.log('\nFiltros do feed');
  const doFeedSaude = await atividadeService.listarRecentes({ areas: ['Saúde'] });
  conferir(
    'filtro por area',
    doFeedSaude.length > 0 && doFeedSaude.every((a) => a.projetoArea === 'Saúde')
  );
  conferir(
    'busca textual ignora acento',
    (await atividadeService.listarRecentes({ termo: 'ciencias' })).some(
      (a) => a.atividade.id === daCoordenadoraPost.id
    )
  );

  console.log('\nFluxos alternativos');
  const qtdAntes = (await atividadeService.listarRecentes()).length;
  await esperaErro('participante de outro projeto nao posta', SemPermissao, 'participantes do projeto', () =>
    atividadeService.postar(ANA, ROBOTICA, { titulo: 'Intrusa', descricao: 'x', foto: null })
  );
  await esperaErro('coordenador de outro projeto nao posta', SemPermissao, 'participantes do projeto', () =>
    atividadeService.postar(COORDENADOR_RUI, ROBOTICA, { titulo: 'Intruso', descricao: 'x', foto: null })
  );
  await esperaErro('projeto inexistente', NaoEncontrado, 'projeto não encontrado', () =>
    atividadeService.postar(COORDENADORA, 999, { titulo: 'Nada', descricao: 'x', foto: null })
  );
  conferir(
    'post recusado nao grava atividade',
    (await atividadeService.listarRecentes()).length === qtdAntes
  );

  console.log('\nGestao da equipe');
  await esperaErro('coordenador de outro projeto nao altera cargo', SemPermissao, 'coordenador do projeto', () =>
    projetoService.alterarCargo(COORDENADOR_RUI, PARTICIPACAO_CARLA_DIAS, 'Chefe')
  );
  await esperaErro('estudante nao altera o proprio cargo', SemPermissao, 'coordenador do projeto', () =>
    projetoService.alterarCargo(CARLA_DIAS, PARTICIPACAO_CARLA_DIAS, 'Chefe')
  );
  await projetoService.alterarCargo(COORDENADORA, PARTICIPACAO_CARLA_DIAS, 'Monitora líder');
  conferir(
    'coordenadora altera o cargo',
    (await projetoService.listarParticipantes(ROBOTICA))[0]?.participacao.cargo === 'Monitora líder'
  );
  await esperaErro('participacao inexistente', NaoEncontrado, 'participação não encontrada', () =>
    projetoService.alterarCargo(COORDENADORA, 999, 'Chefe')
  );

  await projetoService.removerParticipante(COORDENADORA, PARTICIPACAO_CARLA_DIAS);
  conferir(
    'removida sai da equipe',
    (await projetoService.listarParticipantes(ROBOTICA)).length === 0
  );
  const historico = await projetoService.meusProjetos(CARLA_DIAS);
  conferir(
    'participacao fica no historico, encerrada',
    historico.length === 1 && historico[0].participacao?.estaAtiva() === false
  );
  await esperaErro('quem saiu da equipe nao posta mais', SemPermissao, 'participantes do projeto', () =>
    atividadeService.postar(CARLA_DIAS, ROBOTICA, { titulo: 'Depois de sair', descricao: 'x', foto: null })
  );
  await esperaErro('nao remove duas vezes', RegraDeNegocio, 'não faz mais parte', () =>
    projetoService.removerParticipante(COORDENADORA, PARTICIPACAO_CARLA_DIAS)
  );
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
