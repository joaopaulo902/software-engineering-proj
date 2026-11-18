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
const DEV_WEB = 2, OFICINA_DADOS = 3;

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
