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
const COORDENADORA = 2;
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
    usuarios
  );
  await verificarRegraDeCandidatura(vagas, usuarios, candidaturaService, ferramentas);
  await verificarFiltrosDoC01(vagaService, ferramentas);
}

/**
 * C01: filtros e ordenacao da busca de vagas. As verificacoes olham as vagas
 * do seed pelo id e conferem que TODO resultado obedece ao filtro, porque
 * outras verificacoes publicam vagas novas antes desta.
 *
 * Vagas abertas do seed:
 *   1 Monitoria de Algoritmos   Tarde  Presencial  8h  Educacao
 *   2 Desenvolvimento Web       Manha  Remoto     12h  Saude, Tecnologia   coord. Rui
 *   3 Oficina de Dados          Noite  Hibrido    10h  Dados
 *   5 Comunicacao e Divulgacao  Manha  Remoto      6h  Saude, Comunicacao  coord. Rui
 * A 4 (Apoio em Eletronica) ja encerrou.
 */
async function verificarFiltrosDoC01(
  vagaService: VagaService,
  { conferir }: FerramentasDeVerificacao
): Promise<void> {
  console.log('\nFrente C - C01: filtros e ordenacao\n');

  const ids = (lista: { vaga: Vaga }[]) => lista.map((item) => item.vaga.id);
  const tem = (lista: { vaga: Vaga }[], id: number) => ids(lista).includes(id);
  const descrever = (lista: { vaga: Vaga }[]) =>
    lista.map((item) => `${item.vaga.id}:${item.vaga.titulo}`).join(', ');

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
    tem(manhaOuNoite, DEV_WEB) && tem(manhaOuNoite, OFICINA_DADOS) && !tem(manhaOuNoite, MONITORIA),
    descrever(manhaOuNoite)
  );
  const remotas = await vagaService.listarAbertas({ modalidades: ['Remoto'] });
  conferir(
    'modalidade: so as remotas',
    tem(remotas, DEV_WEB) && tem(remotas, COMUNICACAO) && remotas.every((i) => i.vaga.modalidade === 'Remoto'),
    descrever(remotas)
  );
  const tecnologia = await vagaService.listarAbertas({ areas: ['Tecnologia'] });
  conferir(
    'area tematica da vaga, mesmo diferente da do projeto',
    tem(tecnologia, DEV_WEB) && !tem(tecnologia, MONITORIA),
    descrever(tecnologia)
  );
  const saude = await vagaService.listarAbertas({ areas: ['saude'] });
  conferir(
    'area sem acento e em minusculas',
    tem(saude, DEV_WEB) && tem(saude, COMUNICACAO) && !tem(saude, OFICINA_DADOS),
    descrever(saude)
  );
  const ate8 = await vagaService.listarAbertas({ cargaHorariaMaxima: 8 });
  conferir(
    'carga horaria maxima: inclui o limite e corta o resto',
    tem(ate8, MONITORIA) && !tem(ate8, DEV_WEB) && ate8.every((i) => i.vaga.cargaHoraria <= 8),
    descrever(ate8)
  );
  const combinados = await vagaService.listarAbertas({
    turnos: ['Manhã'],
    modalidades: ['Remoto'],
    cargaHorariaMaxima: 8
  });
  conferir(
    'filtros combinados: precisa passar em todos',
    tem(combinados, COMUNICACAO) && !tem(combinados, DEV_WEB),
    descrever(combinados)
  );
  const pelaDescricao = await vagaService.listarAbertas({ termo: 'agendamento' });
  conferir('texto encontra pela descricao', tem(pelaDescricao, DEV_WEB), descrever(pelaDescricao));
  const peloCoordenador = await vagaService.listarAbertas({ termo: 'rui' });
  conferir(
    'texto encontra pelo coordenador',
    tem(peloCoordenador, DEV_WEB) && tem(peloCoordenador, COMUNICACAO) && !tem(peloCoordenador, MONITORIA),
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
  const card = feed.find((item) => item.vaga.id === DEV_WEB);
  conferir(
    'o feed traz os campos novos',
    !!card && card.vaga.areasTematicas.includes('Tecnologia') && card.vaga.descricao.length > 0
  );
}
