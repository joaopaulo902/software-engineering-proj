/**
 * Verificacoes da frente C: vaga, perfil e administracao.
 *
 * Ficam neste arquivo, e nao no `verificar.ts`, para que cada frente mexa
 * no seu proprio arquivo: o `verificar.ts` so importa e chama
 * `verificarFrenteC`, e o conflito na hora de juntar as branches, se houver,
 * fica numa linha.
 *
 * Roda junto com as demais em `npm run verificar`.
 */
import { BancoEmMemoria } from '../persistencia/infra/BancoEmMemoria';
import { VagaRepository } from '../persistencia/repositorios/VagaRepository';
import { ProjetoRepository } from '../persistencia/repositorios/ProjetoRepository';
import { UsuarioRepository } from '../persistencia/repositorios/UsuarioRepository';
import { CandidaturaRepository } from '../persistencia/repositorios/CandidaturaRepository';
import { VagaService } from '../dominio/servicos/VagaService';
import { CandidaturaService } from '../dominio/servicos/CandidaturaService';
import { DadosNovaVaga, Vaga } from '../dominio/entidades/Vaga';
import { Usuario } from '../dominio/entidades/Usuario';
import { hojeComoDia } from '../dominio/calendario';
import { NaoEncontrado, RegraDeNegocio } from '../dominio/erros';
import { ParticipacaoRepository } from '../persistencia/repositorios/ParticipacaoRepository';
import { PublicadorDeEventos } from '../dominio/eventos/PublicadorDeEventos';
import { MAIOR_ID, lerId } from '../apresentacao/parametros';
import { UsuarioService } from '../dominio/servicos/UsuarioService';
import { CARGO_DO_COORDENADOR } from '../dominio/servicos/ProjetoService';
import { DadosDoPerfil } from '../persistencia/interfaces/IUsuarioRepository';
import { lerDadosDoPerfil } from '../apresentacao/controllers/UsuarioController';
import { apresentarVagaComProjeto } from '../apresentacao/apresentadores';

/** O que o `verificar.ts` empresta: a contagem de resultados e a vaga padrao. */
export interface FerramentasDeVerificacao {
  conferir(titulo: string, condicao: boolean, detalhe?: string): void;
  esperaErro(
    titulo: string,
    tipo: Function,
    trecho: string,
    acao: () => Promise<unknown>
  ): Promise<void>;
  /** Uma vaga valida para o C06; cada teste muda so o campo que interessa. */
  novaVaga(alteracoes?: Partial<DadosNovaVaga>): DadosNovaVaga;
}

// ids vindos do seed
const COORDENADORA = 2, COORDENADOR_RUI = 3;
const ROBOTICA = 1, SAUDE_DIGITAL = 2, DADOS_PARA_TODOS = 3;
const ANA = 4, BRUNO = 5, CARLA_DIAS = 6, DIEGO = 7;
const MONITORIA = 1, DEV_WEB = 2, OFICINA_DADOS = 3, ELETRONICA = 4, COMUNICACAO = 5;

const UM_DIA = 24 * 60 * 60 * 1000;

export async function verificarFrenteC(
  banco: BancoEmMemoria,
  ferramentas: FerramentasDeVerificacao
): Promise<void> {
  const vagas = new VagaRepository(banco.executor);
  const projetos = new ProjetoRepository(banco.executor);
  const usuarios = new UsuarioRepository(banco.executor);
  const vagaService = new VagaService(banco.unidade, vagas, projetos, usuarios);

  await verificarCamposNovosDaVaga(vagaService, vagas, ferramentas);

  const candidaturaService = new CandidaturaService(
    banco.unidade,
    new CandidaturaRepository(banco.executor),
    vagas,
    usuarios,
    new ParticipacaoRepository(banco.executor),
    new PublicadorDeEventos()
  );
  await verificarRegraDeCandidatura(vagas, usuarios, candidaturaService, ferramentas);
  await verificarFiltrosDoC01(vagaService, ferramentas);
  await verificarDetalheDaVaga(vagaService, ferramentas);
  await verificarProjetoInativoEVagaEsgotada(banco, vagaService, candidaturaService, ferramentas);

  const usuarioService = new UsuarioService(
    banco.unidade,
    usuarios,
    projetos,
    new ParticipacaoRepository(banco.executor)
  );
  await verificarPerfil(banco, usuarioService, vagaService, ferramentas);
}

/**
 * C16: perfil proprio e de outra pessoa, quem ve o e-mail, Configuracoes e
 * a leitura do corpo do PUT /api/perfil. O Diego e editado e volta ao que
 * era no fim, porque a frente A roda depois e usa o seed.
 */
async function verificarPerfil(
  banco: BancoEmMemoria,
  usuarioService: UsuarioService,
  vagaService: VagaService,
  { conferir, esperaErro }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - C16: perfil\n');

  const daAna = await usuarioService.perfil(ANA, ANA);
  conferir(
    'perfil proprio: dados do seed, e-mail e Configuracoes',
    daAna.ehProprio && daAna.emailVisivel && daAna.usuario.curso === 'Ciência da Computação' &&
      (daAna.usuario.perfil.github ?? '').includes('ana-souza'),
    `${daAna.usuario.nome} · ${daAna.usuario.perfil.github}`
  );
  const equipeDaAna = daAna.projetos.find((p) => p.projetoId === SAUDE_DIGITAL);
  conferir(
    'o perfil lista os projetos em que a pessoa esta',
    equipeDaAna !== undefined && equipeDaAna.participacao !== null && equipeDaAna.participacao.estaAtiva(),
    daAna.projetos.map((p) => `${p.projetoNome} (${p.cargo})`).join(', ')
  );

  const anaParaDiego = await usuarioService.perfil(ANA, DIEGO);
  conferir(
    'outro estudante ve o perfil, mas nao o e-mail',
    !anaParaDiego.ehProprio && !anaParaDiego.emailVisivel && anaParaDiego.usuario.nome === 'Ana Souza'
  );
  const anaParaCoordenadora = await usuarioService.perfil(ANA, COORDENADORA);
  conferir('coordenador ve o e-mail do estudante', anaParaCoordenadora.emailVisivel);

  const ruiParaDiego = await usuarioService.perfil(COORDENADOR_RUI, DIEGO);
  const coordenado = ruiParaDiego.projetos.find((p) => p.projetoId === SAUDE_DIGITAL);
  conferir(
    'perfil do coordenador: e-mail institucional e os projetos que coordena',
    ruiParaDiego.emailVisivel && coordenado?.participacao === null && coordenado?.cargo === CARGO_DO_COORDENADOR,
    ruiParaDiego.projetos.map((p) => `${p.projetoNome} (${p.cargo})`).join(', ')
  );

  await esperaErro('perfil de usuario inexistente', NaoEncontrado, 'usuário não encontrado', () =>
    usuarioService.perfil(999, DIEGO)
  );

  console.log('\nConfiguracoes do perfil');
  const perfilDoDiego: DadosDoPerfil = {
    descricao: 'Estudante de CC interessado em dados abertos.',
    contato: 'Telegram: @diego',
    lattes: null,
    linkedin: 'https://www.linkedin.com/in/diego-exemplo',
    github: null,
    paginaPessoal: 'https://diego.exemplo.dev',
    curso: 'Ciência da Computação',
    semestre: 4
  };
  try {
    const antes = await vagaService.detalhar(OFICINA_DADOS, DIEGO);
    await usuarioService.atualizarPerfil(DIEGO, perfilDoDiego);
    const salvo = (await usuarioService.perfil(DIEGO, DIEGO)).usuario;
    conferir(
      'grava descricao, contato e links',
      salvo.perfil.descricao === perfilDoDiego.descricao &&
        salvo.perfil.contato === perfilDoDiego.contato &&
        salvo.perfil.linkedin === perfilDoDiego.linkedin &&
        salvo.perfil.paginaPessoal === perfilDoDiego.paginaPessoal &&
        salvo.perfil.lattes === null,
      JSON.stringify(salvo.perfil)
    );

    await usuarioService.atualizarPerfil(DIEGO, { ...perfilDoDiego, semestre: 6 });
    const depois = await vagaService.detalhar(OFICINA_DADOS, DIEGO);
    conferir(
      'o semestre editado no perfil vale na regra de candidatura',
      (antes.motivoDeInelegibilidade ?? '').includes('6º semestre') && depois.motivoDeInelegibilidade === null,
      `antes: ${antes.motivoDeInelegibilidade} · depois: ${depois.motivoDeInelegibilidade}`
    );

    await esperaErro('estudante nao fica sem curso e semestre', RegraDeNegocio, 'curso e o semestre', () =>
      usuarioService.atualizarPerfil(DIEGO, { ...perfilDoDiego, curso: null, semestre: null })
    );
    await esperaErro('coordenador nao tem curso nem semestre', RegraDeNegocio, 'perfil de estudante', () =>
      usuarioService.atualizarPerfil(COORDENADORA, { ...perfilDoDiego, curso: 'Estatística', semestre: 3 })
    );
  } finally {
    await banco.executor.query(
      `UPDATE usuario
          SET descricao = '', contato = '', lattes = NULL, linkedin = NULL, github = NULL,
              pagina_pessoal = NULL, curso = 'Ciência da Computação', semestre = 4
        WHERE id = $1`,
      [DIEGO]
    );
  }

  console.log('\nPUT /api/perfil: leitura do corpo');
  conferir(
    'link "javascript:" e recusado',
    typeof lerDadosDoPerfil({ github: 'javascript:alert(1)' }) === 'string'
  );
  conferir(
    'link sem http(s) e recusado',
    typeof lerDadosDoPerfil({ linkedin: 'linkedin.com/in/fulano' }) === 'string'
  );
  conferir('caractere NUL e recusado', typeof lerDadosDoPerfil({ descricao: 'a\u0000b' }) === 'string');
  conferir(
    'descricao acima de 1000 caracteres e recusada',
    typeof lerDadosDoPerfil({ descricao: 'x'.repeat(1001) }) === 'string'
  );
  conferir('semestre fora de 1 a 20 e recusado', typeof lerDadosDoPerfil({ semestre: 21 }) === 'string');
  conferir('campo que nao e texto e recusado', typeof lerDadosDoPerfil({ contato: 42 }) === 'string');
  const lido = lerDadosDoPerfil({
    descricao: '  Oi  ',
    lattes: '   ',
    github: 'https://github.com/fulano',
    curso: 'Estatística',
    semestre: '3'
  });
  conferir(
    'dados validos: espacos cortados e link em branco vira vazio',
    typeof lido !== 'string' && lido.descricao === 'Oi' && lido.lattes === null &&
      lido.github === 'https://github.com/fulano' && lido.semestre === 3 && lido.contato === '',
    JSON.stringify(lido)
  );

  const card = apresentarVagaComProjeto((await vagaService.detalhar(COMUNICACAO, DIEGO)).vaga);
  conferir(
    'card de vaga traz o id do responsavel, para o link do perfil',
    card.coordenadorId === COORDENADOR_RUI,
    String(card.coordenadorId)
  );
}

/**
 * C06 so publica em projeto que aceita vagas; o C01 so lista vaga com prazo
 * E posicao livre; ids acima do limite do banco sao recusados na entrada.
 */
async function verificarProjetoInativoEVagaEsgotada(
  banco: BancoEmMemoria,
  vagaService: VagaService,
  candidaturaService: CandidaturaService,
  { conferir, esperaErro, novaVaga }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - Projeto inativo, vaga esgotada e ids\n');

  console.log('C06 em projeto inativo');
  await banco.executor.query(`UPDATE projeto SET situacao = 'INATIVO' WHERE id = $1`, [DADOS_PARA_TODOS]);
  try {
    const projetos = (await vagaService.projetosParaPublicar(COORDENADORA)).map((p) => p.id);
    conferir(
      'o formulario so oferece os projetos ativos',
      projetos.includes(ROBOTICA) && !projetos.includes(DADOS_PARA_TODOS),
      projetos.join(', ')
    );
    await esperaErro('publicar em projeto inativo e recusado', RegraDeNegocio, 'inativo', () =>
      vagaService.publicar(COORDENADORA, novaVaga({ projetoId: DADOS_PARA_TODOS }))
    );
  } finally {
    await banco.executor.query(`UPDATE projeto SET situacao = 'ATIVO' WHERE id = $1`, [DADOS_PARA_TODOS]);
  }

  console.log('\nVaga esgotada sai do C01');
  const unica = await vagaService.publicar(
    COORDENADORA,
    novaVaga({ titulo: 'Vaga de uma posição', vagasTotais: 1 })
  );
  conferir(
    'com posicao livre, aparece na busca',
    (await vagaService.listarAbertas()).some((i) => i.vaga.id === unica.id)
  );
  await candidaturaService.candidatar(ANA, unica.id, null);
  conferir(
    'depois de ocupada a ultima posicao, sai da busca',
    !(await vagaService.listarAbertas()).some((i) => i.vaga.id === unica.id)
  );
  const detalhe = await vagaService.detalhar(unica.id, DIEGO);
  conferir(
    'mas o detalhe continua abrindo, com o motivo',
    (detalhe.motivoDeInelegibilidade ?? '').includes('posições'),
    String(detalhe.motivoDeInelegibilidade)
  );

  console.log('\nIds no limite do banco (INTEGER)');
  conferir('o maior id do banco e aceito', lerId(String(MAIOR_ID)) === MAIOR_ID);
  conferir('um acima do limite e recusado', lerId(String(MAIOR_ID + 1)) === null);
  conferir('notacao cientifica enorme e recusada', lerId('1e21') === null);
}

/** C03: o detalhe da vaga e o motivo de quem esta vendo nao poder se candidatar. */
async function verificarDetalheDaVaga(
  vagaService: VagaService,
  { conferir, esperaErro }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - C03: detalhes da vaga\n');

  const paraDiego = await vagaService.detalhar(COMUNICACAO, DIEGO);
  conferir(
    'traz a vaga com o projeto e o coordenador',
    paraDiego.vaga.vaga.id === COMUNICACAO &&
      paraDiego.vaga.projetoNome === 'Saúde Digital' &&
      paraDiego.vaga.coordenadorNome === 'Prof. Rui Bastos',
    `${paraDiego.vaga.vaga.titulo} · ${paraDiego.vaga.projetoNome} · ${paraDiego.vaga.coordenadorNome}`
  );
  conferir(
    'estudante que atende tudo: sem motivo',
    paraDiego.motivoDeInelegibilidade === null,
    String(paraDiego.motivoDeInelegibilidade)
  );

  const paraCarlaDias = await vagaService.detalhar(OFICINA_DADOS, CARLA_DIAS);
  conferir(
    'curso fora da lista: o motivo vem da regra do C04',
    (paraCarlaDias.motivoDeInelegibilidade ?? '').includes('só para'),
    String(paraCarlaDias.motivoDeInelegibilidade)
  );

  const encerrada = await vagaService.detalhar(ELETRONICA, DIEGO);
  conferir(
    'vaga encerrada continua visivel, com o motivo do prazo',
    encerrada.vaga.vaga.id === ELETRONICA && (encerrada.motivoDeInelegibilidade ?? '').includes('prazo'),
    String(encerrada.motivoDeInelegibilidade)
  );

  const paraCoordenadora = await vagaService.detalhar(COMUNICACAO, COORDENADORA);
  conferir(
    'coordenador ve a vaga, mas nao se candidata',
    (paraCoordenadora.motivoDeInelegibilidade ?? '').includes('Apenas estudantes'),
    String(paraCoordenadora.motivoDeInelegibilidade)
  );

  await esperaErro('vaga inexistente', NaoEncontrado, 'vaga não encontrada', () =>
    vagaService.detalhar(999, DIEGO)
  );
}

/**
 * C01: filtros e ordenacao da busca de vagas. As verificacoes olham as vagas
 * do seed pelo id e conferem que TODO resultado obedece ao filtro, porque
 * outras verificacoes publicam vagas novas antes desta.
 *
 * Vagas abertas usadas:
 *   1 Monitoria de Algoritmos   Tarde  Presencial  8h  Educacao
 *   3 Oficina de Dados          Noite  Hibrido    10h  Dados
 *   5 Comunicacao e Divulgacao  Manha  Remoto      6h  Saude, Comunicacao  coord. Rui
 *   e "Desenvolvimento Mobile", publicada aqui com os dados da vaga 2 do seed
 *   (Manha, Remoto, 12h, Saude e Tecnologia, coord. Rui). A vaga 2 tem uma
 *   posicao so, que o teste do C04 ocupa, e por isso sai da busca.
 * A 4 (Apoio em Eletronica) ja encerrou.
 */
async function verificarFiltrosDoC01(
  vagaService: VagaService,
  { conferir, novaVaga }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - C01: filtros e ordenacao\n');

  const ids = (lista: { vaga: Vaga }[]) => lista.map((item) => item.vaga.id);
  const tem = (lista: { vaga: Vaga }[], id: number) => ids(lista).includes(id);
  const descrever = (lista: { vaga: Vaga }[]) =>
    lista.map((item) => `${item.vaga.id}:${item.vaga.titulo}`).join(', ');

  const MOBILE = (
    await vagaService.publicar(
      COORDENADOR_RUI,
      novaVaga({
        projetoId: SAUDE_DIGITAL,
        titulo: 'Desenvolvimento Mobile',
        descricao: 'Criar o aplicativo de agendamento dos postos de saúde.',
        areasTematicas: ['Saúde', 'Tecnologia'],
        turno: 'Manhã',
        modalidade: 'Remoto',
        cargaHoraria: 12,
        vagasTotais: 3
      })
    )
  ).id;

  console.log('Filtros');
  const todas = await vagaService.listarAbertas();
  conferir('sem filtro, nenhuma vaga encerrada', !tem(todas, ELETRONICA), descrever(todas));

  const noite = await vagaService.listarAbertas({ turnos: ['Noite'] });
  conferir(
    'turno: so as da noite',
    tem(noite, OFICINA_DADOS) && noite.every((i) => i.vaga.turno === 'Noite'),
    descrever(noite)
  );
  const manhaOuNoite = await vagaService.listarAbertas({ turnos: ['Manhã', 'Noite'] });
  conferir(
    'dois turnos: vale qualquer um deles',
    tem(manhaOuNoite, MOBILE) && tem(manhaOuNoite, OFICINA_DADOS) && !tem(manhaOuNoite, MONITORIA),
    descrever(manhaOuNoite)
  );
  const remotas = await vagaService.listarAbertas({ modalidades: ['Remoto'] });
  conferir(
    'modalidade: so as remotas',
    tem(remotas, MOBILE) && tem(remotas, COMUNICACAO) && remotas.every((i) => i.vaga.modalidade === 'Remoto'),
    descrever(remotas)
  );
  const tecnologia = await vagaService.listarAbertas({ areas: ['Tecnologia'] });
  conferir(
    'area tematica da vaga, mesmo diferente da do projeto',
    tem(tecnologia, MOBILE) && !tem(tecnologia, MONITORIA),
    descrever(tecnologia)
  );
  const saude = await vagaService.listarAbertas({ areas: ['saude'] });
  conferir(
    'area sem acento e em minusculas',
    tem(saude, MOBILE) && tem(saude, COMUNICACAO) && !tem(saude, OFICINA_DADOS),
    descrever(saude)
  );
  const ate8 = await vagaService.listarAbertas({ cargaHorariaMaxima: 8 });
  conferir(
    'carga horaria maxima: inclui o limite e corta o resto',
    tem(ate8, MONITORIA) && !tem(ate8, MOBILE) && ate8.every((i) => i.vaga.cargaHoraria <= 8),
    descrever(ate8)
  );
  const combinados = await vagaService.listarAbertas({
    turnos: ['Manhã'],
    modalidades: ['Remoto'],
    cargaHorariaMaxima: 8
  });
  conferir(
    'filtros combinados: precisa passar em todos',
    tem(combinados, COMUNICACAO) && !tem(combinados, MOBILE),
    descrever(combinados)
  );
  const pelaDescricao = await vagaService.listarAbertas({ termo: 'agendamento' });
  conferir('texto encontra pela descricao', tem(pelaDescricao, MOBILE), descrever(pelaDescricao));
  const peloCoordenador = await vagaService.listarAbertas({ termo: 'rui' });
  conferir(
    'texto encontra pelo coordenador',
    tem(peloCoordenador, MOBILE) && tem(peloCoordenador, COMUNICACAO) && !tem(peloCoordenador, MONITORIA),
    descrever(peloCoordenador)
  );

  console.log('\nOrdenacao');
  const emOrdem = (lista: { vaga: Vaga }[], valor: (v: Vaga) => number) =>
    lista.every((item, i) => i === 0 || valor(lista[i - 1].vaga) <= valor(item.vaga));
  conferir(
    'padrao: encerra antes, aparece antes',
    emOrdem(todas, (v) => v.dataEncerramento.getTime())
  );
  const recentes = await vagaService.listarAbertas({ ordenarPor: 'PUBLICACAO' });
  conferir(
    'por publicacao: mais nova primeiro',
    emOrdem(recentes, (v) => -v.publicadaEm.getTime()),
    descrever(recentes)
  );
  const porCarga = await vagaService.listarAbertas({ ordenarPor: 'CARGA_HORARIA' });
  conferir(
    'por carga horaria: menos horas primeiro',
    emOrdem(porCarga, (v) => v.cargaHoraria),
    porCarga.map((i) => `${i.vaga.cargaHoraria}h`).join(', ')
  );
}

/**
 * motivoDeInelegibilidade: a regra unica de quem pode se candidatar,
 * usada pelo C04 e pela tela Detalhes da Vaga (C03).
 */
async function verificarRegraDeCandidatura(
  vagas: VagaRepository,
  usuarios: UsuarioRepository,
  candidaturaService: CandidaturaService,
  { conferir, novaVaga }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - Regra de quem pode se candidatar\n');

  const ana = (await usuarios.buscarPorId(ANA))!; // Ciencia da Computacao, 5o
  const bruno = (await usuarios.buscarPorId(BRUNO))!; // Ciencia da Computacao, 2o
  const carlaDias = (await usuarios.buscarPorId(CARLA_DIAS))!; // Engenharia da Computacao, 7o
  const diego = (await usuarios.buscarPorId(DIEGO))!; // Ciencia da Computacao, 4o
  const coordenadora = (await usuarios.buscarPorId(COORDENADORA))!;
  const semPerfil = new Usuario(99, 'Estudante Sem Perfil', 'sem.perfil@inf.ufrgs.br', 'ESTUDANTE', null, null);

  const motivo = (vaga: Vaga, usuario: Usuario) => vaga.motivoDeInelegibilidade(usuario);
  const contem = (texto: string | null, trecho: string) =>
    texto !== null && texto.toLowerCase().includes(trecho.toLowerCase());

  console.log('Pode se candidatar');
  const aberta = Vaga.nova(novaVaga());
  conferir('estudante que atende tudo', motivo(aberta, diego) === null, String(motivo(aberta, diego)));
  conferir(
    'lista de cursos vazia aceita qualquer curso',
    motivo(aberta, carlaDias) === null,
    String(motivo(aberta, carlaDias))
  );
  const soComputacao = Vaga.nova(novaVaga({ cursosAceitos: ['ciencia da computacao'] }));
  conferir(
    'curso aceito mesmo escrito sem acento e em minusculas',
    motivo(soComputacao, ana) === null,
    String(motivo(soComputacao, ana))
  );

  console.log('\nNao pode, com o motivo');
  conferir(
    'curso fora da lista',
    contem(motivo(soComputacao, carlaDias), 'só para'),
    String(motivo(soComputacao, carlaDias))
  );
  const oficina = (await vagas.buscarPorId(OFICINA_DADOS))!;
  conferir(
    'mensagem do curso lista os cursos aceitos',
    motivo(oficina, carlaDias) ===
      'Esta vaga é só para Ciência da Computação e Estatística. Seu curso é Engenharia da Computação.',
    String(motivo(oficina, carlaDias))
  );
  const exigeSexto = Vaga.nova(novaVaga({ semestreMinimo: 6 }));
  conferir(
    'semestre abaixo do minimo',
    contem(motivo(exigeSexto, bruno), 'exige estar no 6º semestre'),
    String(motivo(exigeSexto, bruno))
  );
  const encerrada = Vaga.nova(
    novaVaga({ dataEncerramento: new Date(hojeComoDia().getTime() - UM_DIA) })
  );
  conferir('prazo encerrado', contem(motivo(encerrada, diego), 'prazo'), String(motivo(encerrada, diego)));
  const semPosicao = Vaga.nova(novaVaga({ vagasTotais: 0 }));
  conferir(
    'sem posicoes disponiveis',
    contem(motivo(semPosicao, diego), 'posições'),
    String(motivo(semPosicao, diego))
  );
  conferir(
    'perfil sem curso e semestre',
    contem(motivo(aberta, semPerfil), 'complete o seu perfil'),
    String(motivo(aberta, semPerfil))
  );
  conferir(
    'coordenador nao se candidata',
    contem(motivo(aberta, coordenadora), 'apenas estudantes'),
    String(motivo(aberta, coordenadora))
  );
  const encerradaESoComputacao = Vaga.nova(
    novaVaga({
      cursosAceitos: ['Ciência da Computação'],
      dataEncerramento: new Date(hojeComoDia().getTime() - UM_DIA)
    })
  );
  conferir(
    'com dois motivos, o prazo vem primeiro',
    contem(motivo(encerradaESoComputacao, carlaDias), 'prazo'),
    String(motivo(encerradaESoComputacao, carlaDias))
  );

  console.log('\nMesma mensagem que o C04 mostra hoje');
  let mensagemDoC04 = '';
  try {
    await candidaturaService.candidatar(BRUNO, OFICINA_DADOS, null);
  } catch (erro) {
    mensagemDoC04 = (erro as Error).message;
  }
  conferir(
    'semestre: a regra e o C04 dizem o mesmo',
    mensagemDoC04 !== '' && mensagemDoC04 === motivo(oficina, bruno),
    `C04: "${mensagemDoC04}" | regra: "${motivo(oficina, bruno)}"`
  );
}

async function verificarCamposNovosDaVaga(
  vagaService: VagaService,
  vagas: VagaRepository,
  { conferir, novaVaga }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - Campos novos da vaga\n');

  console.log('Publicacao com todos os campos (C06)');
  const completa = await vagaService.publicar(
    COORDENADORA,
    novaVaga({
      titulo: 'Bolsista de Robótica',
      descricao: 'Montar os kits das oficinas.',
      areasTematicas: ['Educação', 'Tecnologia'],
      cursosAceitos: ['Engenharia da Computação'],
      beneficio: 'Bolsa',
      duracaoEmMeses: 12
    })
  );
  const relida = (await vagas.buscarPorId(completa.id))!;
  conferir('descricao gravada', relida.descricao === 'Montar os kits das oficinas.', relida.descricao);
  conferir(
    'areas tematicas gravadas',
    relida.areasTematicas.join('|') === 'Educação|Tecnologia',
    relida.areasTematicas.join(', ')
  );
  conferir(
    'cursos aceitos gravados',
    relida.cursosAceitos.join('|') === 'Engenharia da Computação',
    relida.cursosAceitos.join(', ')
  );
  conferir('beneficio gravado', relida.beneficio === 'Bolsa', relida.beneficio);
  conferir('duracao gravada', relida.duracaoEmMeses === 12, String(relida.duracaoEmMeses));
  conferir(
    'data de publicacao preenchida pelo banco',
    Math.abs(relida.publicadaEm.getTime() - Date.now()) < 60_000,
    relida.publicadaEm.toISOString()
  );

  console.log('\nPublicacao sem os campos novos (formulario antigo)');
  const publicada = await vagaService.publicar(COORDENADORA, novaVaga({ titulo: 'Vaga sem campos novos' }));
  const simples = (await vagas.buscarPorId(publicada.id))!;
  conferir(
    'sem area informada, vale a area do projeto',
    simples.areasTematicas.join('|') === 'Educação',
    simples.areasTematicas.join(', ')
  );
  conferir('sem curso informado, lista vazia (todos os cursos)', simples.cursosAceitos.length === 0);
  conferir('beneficio padrao', simples.beneficio === 'Horas de extensão', simples.beneficio);
  conferir('sem duracao', simples.duracaoEmMeses === null);

  console.log('\nVagas do seed');
  const seed = (await vagas.buscarPorId(DEV_WEB))!;
  conferir(
    'Desenvolvimento Web com os campos do seed',
    seed.beneficio === 'Bolsa' && seed.duracaoEmMeses === 12 && seed.cursosAceitos.length === 2,
    `${seed.beneficio}, ${seed.duracaoEmMeses} meses, ${seed.cursosAceitos.join(', ')}`
  );
  const feed = await vagaService.listarAbertas();
  const card = feed.find((item) => item.vaga.id === COMUNICACAO);
  conferir(
    'o feed traz os campos novos',
    !!card && card.vaga.areasTematicas.includes('Comunicação') && card.vaga.descricao.length > 0
  );
}
