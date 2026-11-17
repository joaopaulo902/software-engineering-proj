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
import { VagaService } from '../dominio/servicos/VagaService';
import { DadosNovaVaga } from '../dominio/entidades/Vaga';

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
const DEV_WEB = 2;

export async function verificarFrenteC(
  banco: BancoEmMemoria,
  ferramentas: FerramentasDeVerificacao
): Promise<void> {
  const vagas = new VagaRepository(banco.executor);
  const projetos = new ProjetoRepository(banco.executor);
  const usuarios = new UsuarioRepository(banco.executor);
  const vagaService = new VagaService(banco.unidade, vagas, projetos, usuarios);

  await verificarCamposNovosDaVaga(vagaService, vagas, ferramentas);
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
