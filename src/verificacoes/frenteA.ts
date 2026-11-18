/**
 * Verificacoes da dupla A: candidaturas.
 *
 *   Padrao State da Candidatura (sem banco)
 *   C04 com historico, aviso ao coordenador e a regra de cursos da frente C
 *   C05 detalhe (Minha candidatura)
 *   C15 candidaturas recebidas
 *   C11 avaliar (inclusive duas avaliacoes ao mesmo tempo)
 *   C07 confirmar e declinar o ingresso
 *   C18 remover
 *   Restricoes do banco e atomicidade
 *
 * Ficam neste arquivo, como as da frente C, para cada frente mexer so no seu.
 * Rodam por ultimo em `npm run verificar`. Usam os dados do seed e as
 * candidaturas que elas mesmas criam; nao dependem do que os testes das
 * outras frentes deixam no banco, e nao mudam nada que eles conferem.
 */
import { CandidaturaService } from '../dominio/servicos/CandidaturaService';
import { NotificacaoService } from '../dominio/servicos/NotificacaoService';
import { PublicadorDeEventos } from '../dominio/eventos/PublicadorDeEventos';
import { NotificadorInApp } from '../dominio/eventos/NotificadorInApp';
import { PedidoIncorporacaoRepository } from '../persistencia/repositorios/PedidoIncorporacaoRepository';
import {
  Candidatura,
  StatusCandidatura,
  STATUS_DE_CANDIDATURA,
} from '../dominio/entidades/Candidatura';
import { EstadoBase } from '../dominio/entidades/EstadoCandidatura';
import { Participacao } from '../dominio/entidades/Participacao';
import { TipoNotificacao } from '../dominio/entidades/Notificacao';
import {
  formatarDia,
  hojeComoDia,
} from '../dominio/calendario';
import {
  NaoEncontrado,
  RegraDeNegocio,
  SemPermissao,
} from '../dominio/erros';

import { BancoEmMemoria } from '../persistencia/infra/BancoEmMemoria';
import { VagaRepository } from '../persistencia/repositorios/VagaRepository';
import { CandidaturaRepository } from '../persistencia/repositorios/CandidaturaRepository';
import { UsuarioRepository } from '../persistencia/repositorios/UsuarioRepository';
import { ProjetoRepository } from '../persistencia/repositorios/ProjetoRepository';
import { ParticipacaoRepository } from '../persistencia/repositorios/ParticipacaoRepository';
import { AtividadeRepository } from '../persistencia/repositorios/AtividadeRepository';
import { NotificacaoRepository } from '../persistencia/repositorios/NotificacaoRepository';

/** O que o `verificar.ts` empresta: a contagem de resultados. */
export interface FerramentasDaDuplaA {
  conferir(titulo: string, condicao: boolean, detalhe?: string): void;
  esperaErro(
    titulo: string,
    tipo: Function,
    trecho: string,
    acao: () => Promise<unknown>
  ): Promise<void>;
}

// ids vindos do seed
const COORDENADORA = 2, COORDENADOR_RUI = 3;
const ANA = 4, BRUNO = 5, CARLA_DIAS = 6, DIEGO = 7;
const ROBOTICA = 1, SAUDE_DIGITAL = 2;
const MONITORIA = 1, OFICINA_DADOS = 3, COMUNICACAO = 5;

export async function verificarFrenteA(
  banco: BancoEmMemoria,
  ferramentas: FerramentasDaDuplaA
): Promise<void> {

  const { conferir, esperaErro } = ferramentas;

  const usuarios = new UsuarioRepository(banco.executor);
  const projetos = new ProjetoRepository(banco.executor);
  const vagas = new VagaRepository(banco.executor);
  const candidaturas = new CandidaturaRepository(banco.executor);
  const participacoes = new ParticipacaoRepository(banco.executor);
  const notificacoes = new NotificacaoRepository(banco.executor);

  const eventos = new PublicadorDeEventos();
  eventos.inscrever(
    new NotificadorInApp(
      notificacoes,
      projetos,
      participacoes,
      new AtividadeRepository(banco.executor),
      usuarios,
      new PedidoIncorporacaoRepository(banco.executor)
    )
  );
  const servico = new CandidaturaService(
    banco.unidade,
    candidaturas,
    vagas,
    usuarios,
    participacoes,
    eventos
  );
  const notificacaoService = new NotificacaoService(notificacoes);

  /** Avisos de um tipo que o usuario recebeu sobre uma candidatura. */
  const avisosSobre = async (usuarioId: number, tipo: TipoNotificacao, candidaturaId: number) =>
    (await notificacaoService.listarDoUsuario(usuarioId, [tipo])).filter(
      (n) => n.referenciaId === candidaturaId
    );
  const restantes = async (vagaId: number) => (await vagas.buscarPorId(vagaId))!.vagasRestantes;
  const statusDe = async (estudanteId: number, candidaturaId: number) =>
    (await servico.detalhar(estudanteId, candidaturaId)).candidatura.candidatura.status;

  console.log('\nDupla A - Padrao State da Candidatura\n');

  const nova = () => new Candidatura(0, MONITORIA, DIEGO, 'EM_ANALISE', null, new Date());

  const emAnalise = nova();
  conferir('em analise ocupa posicao', emAnalise.ocupaPosicao());
  emAnalise.aceitar(new Date());
  conferir('aceitar leva a ACEITA', emAnalise.status === 'ACEITA', emAnalise.status);
  conferir('aceita continua ocupando posicao', emAnalise.ocupaPosicao());
  conferir(
    'a transicao anota uma linha de historico',
    emAnalise.historicoNaoGravado().length === 1 &&
      emAnalise.historicoNaoGravado()[0].status === 'ACEITA'
  );
  await esperaErro('aceita nao e avaliada de novo', RegraDeNegocio, 'avaliar', async () =>
    emAnalise.recusar(new Date())
  );
  await esperaErro('aceita nao e removida', RegraDeNegocio, 'remover', async () =>
    emAnalise.remover(new Date())
  );

  emAnalise.declinar('  Consegui uma bolsa no mesmo turno.  ', new Date());
  conferir('declinar leva a DECLINADA', emAnalise.status === 'DECLINADA', emAnalise.status);
  conferir(
    'declinar guarda o motivo, sem espacos nas pontas',
    emAnalise.motivoDeclinio === 'Consegui uma bolsa no mesmo turno.',
    String(emAnalise.motivoDeclinio)
  );
  conferir(
    'o motivo vai para a observacao do historico',
    emAnalise.historicoNaoGravado()[1]?.observacao === 'Consegui uma bolsa no mesmo turno.'
  );
  conferir('declinada nao ocupa posicao', !emAnalise.ocupaPosicao());

  const semMotivo = nova();
  semMotivo.aceitar(new Date());
  semMotivo.declinar('   ', new Date());
  conferir('motivo em branco vira vazio', semMotivo.motivoDeclinio === null);

  await esperaErro('em analise nao e confirmada', RegraDeNegocio, 'confirmar', async () =>
    nova().confirmar(new Date())
  );
  await esperaErro('em analise nao e declinada', RegraDeNegocio, 'declinar', async () =>
    nova().declinar(null, new Date())
  );

  const confirmada = nova();
  confirmada.aceitar(new Date());
  confirmada.confirmar(new Date());
  conferir('confirmada ocupa posicao', confirmada.status === 'CONFIRMADA' && confirmada.ocupaPosicao());

  const finais: StatusCandidatura[] = ['RECUSADA', 'DECLINADA', 'REMOVIDA', 'CONFIRMADA'];
  let todasAsAcoesRecusadas = true;
  for (const status of finais) {
    const c = new Candidatura(1, MONITORIA, DIEGO, status, null, new Date());
    const acoes = [
      () => c.aceitar(new Date()),
      () => c.recusar(new Date()),
      () => c.confirmar(new Date()),
      () => c.declinar(null, new Date()),
      () => c.remover(new Date())
    ];
    for (const acao of acoes) {
      try {
        acao();
        todasAsAcoesRecusadas = false;
      } catch (erro) {
        if (!(erro instanceof RegraDeNegocio)) todasAsAcoesRecusadas = false;
      }
    }
  }
  conferir('recusada, declinada, removida e confirmada nao aceitam nenhuma acao', todasAsAcoesRecusadas);
  conferir(
    'recusada, declinada e removida nao ocupam posicao',
    (['RECUSADA', 'DECLINADA', 'REMOVIDA'] as StatusCandidatura[]).every(
      (s) => !new Candidatura(1, 1, 1, s, null, new Date()).ocupaPosicao()
    )
  );
  conferir(
    'cada status gravado vira o estado certo',
    STATUS_DE_CANDIDATURA.every((s) => EstadoBase.para(s).status() === s)
  );

  console.log('\nDupla A - C04 com historico e aviso\n');

  const antesMonitoria = await restantes(MONITORIA);
  const doDiego = await servico.candidatar(DIEGO, MONITORIA, 'Gosto de ensinar Python.');
  conferir('candidatura em analise', doDiego.status === 'EM_ANALISE', doDiego.status);
  conferir(
    'posicao reservada na vaga',
    (await restantes(MONITORIA)) === antesMonitoria - 1,
    `antes ${antesMonitoria}, depois ${await restantes(MONITORIA)}`
  );
  const historicoInicial = await candidaturas.listarHistorico(doDiego.id);
  conferir(
    'nasce com a linha EM_ANALISE no historico',
    historicoInicial.length === 1 && historicoInicial[0].status === 'EM_ANALISE'
  );
  conferir(
    'o coordenador do projeto e avisado (NOVA_CANDIDATURA)',
    (await avisosSobre(COORDENADORA, 'NOVA_CANDIDATURA', doDiego.id)).length === 1
  );
  await esperaErro(
    'o C04 usa a regra de cursos da frente C',
    RegraDeNegocio,
    'só para',
    () => servico.candidatar(CARLA_DIAS, OFICINA_DADOS, null)
  );
  await esperaErro('candidatura repetida', RegraDeNegocio, 'já se candidatou', () =>
    servico.candidatar(DIEGO, MONITORIA, null)
  );
  // Fica em analise para o C15 (filtro por status) e para a disputa do C11.
  // Criada aqui para esta secao nao depender do que outros testes deixam no banco.
  const daCarlaDias = await servico.candidatar(CARLA_DIAS, COMUNICACAO, null);

  // Ana participa da Saude Digital pelo seed: nao se candidata a vaga dela.
  // Se pudesse, a candidatura aceita prenderia a posicao, porque o C07 a recusaria.
  const antesDaAna = await restantes(COMUNICACAO);
  await esperaErro(
    'quem ja esta na equipe nao se candidata a vaga do mesmo projeto',
    RegraDeNegocio,
    'já faz parte',
    () => servico.candidatar(ANA, COMUNICACAO, null)
  );
  conferir('a recusa nao reserva posicao', (await restantes(COMUNICACAO)) === antesDaAna);

  console.log('\nDupla A - C05 Minha candidatura\n');

  const detalhe = await servico.detalhar(DIEGO, doDiego.id);
  conferir(
    'detalhe traz vaga, projeto e coordenador',
    detalhe.candidatura.vagaTitulo === 'Monitoria de Algoritmos' &&
      detalhe.candidatura.projetoId === ROBOTICA &&
      detalhe.candidatura.projetoNome === 'Robótica na Escola' &&
      detalhe.candidatura.coordenadorNome === 'Profa. Carla Menezes',
    JSON.stringify({ ...detalhe.candidatura, candidatura: undefined })
  );
  conferir('detalhe traz o historico', detalhe.historico.length === 1);
  const listaDoDiego = await servico.listarDoEstudante(DIEGO);
  conferir(
    'a lista traz o projeto e o coordenador',
    listaDoDiego.some(
      (c) => c.candidatura.id === doDiego.id && c.projetoId === ROBOTICA && c.coordenadorNome !== ''
    )
  );
  conferir(
    'a lista vem da mais recente para a mais antiga',
    listaDoDiego.every(
      (c, i) =>
        i === 0 ||
        listaDoDiego[i - 1].candidatura.criadaEm.getTime() >= c.candidatura.criadaEm.getTime()
    )
  );
  await esperaErro('candidatura de outro estudante', NaoEncontrado, 'não encontrada', () =>
    servico.detalhar(ANA, doDiego.id)
  );
  await esperaErro('candidatura inexistente', NaoEncontrado, 'não encontrada', () =>
    servico.detalhar(DIEGO, 999)
  );

  console.log('\nDupla A - C15 Candidaturas recebidas\n');

  const daCarla = await servico.listarRecebidas(COORDENADORA);
  const doBrunoNaComunicacao = (await servico.listarDoEstudante(BRUNO)).find(
    (c) => c.candidatura.vagaId === COMUNICACAO
  )!.candidatura;
  conferir('coordenadora ve a candidatura nova', daCarla.some((r) => r.candidatura.id === doDiego.id));
  conferir(
    'coordenadora nao ve candidaturas de projetos de outro',
    !daCarla.some((r) => r.candidatura.id === doBrunoNaComunicacao.id)
  );
  conferir(
    'cada item traz o estudante, a vaga e o projeto',
    daCarla.every((r) => r.estudante.id === r.candidatura.estudanteId && r.vagaTitulo && r.projetoNome)
  );
  const soMonitoria = await servico.listarRecebidas(COORDENADORA, { vagaId: MONITORIA });
  conferir(
    'filtro por vaga',
    soMonitoria.length >= 2 && soMonitoria.every((r) => r.candidatura.vagaId === MONITORIA),
    `${soMonitoria.length} encontradas`
  );
  const soAceitas = await servico.listarRecebidas(COORDENADOR_RUI, { status: ['ACEITA'] });
  conferir(
    'filtro por status',
    soAceitas.length >= 1 && soAceitas.every((r) => r.candidatura.status === 'ACEITA'),
    `${soAceitas.length} encontradas`
  );
  const variosStatus = await servico.listarRecebidas(COORDENADOR_RUI, {
    status: ['ACEITA', 'EM_ANALISE']
  });
  conferir(
    'filtro com mais de um status',
    variosStatus.length > soAceitas.length &&
      variosStatus.every((r) => ['ACEITA', 'EM_ANALISE'].includes(r.candidatura.status))
  );
  const recebida = await servico.detalharRecebida(COORDENADORA, doDiego.id);
  conferir(
    'detalhe recebido traz o estudante e o historico',
    recebida.estudante.nome === 'Diego Alves' && recebida.historico.length === 1
  );
  await esperaErro('estudante nao ve candidaturas recebidas', SemPermissao, 'apenas coordenadores', () =>
    servico.listarRecebidas(ANA)
  );
  await esperaErro('coordenador nao abre candidatura de outro projeto', NaoEncontrado, 'não encontrada', () =>
    servico.detalharRecebida(COORDENADOR_RUI, doDiego.id)
  );

  console.log('\nDupla A - C11 Avaliar candidatura\n');

  const reservadas = await restantes(MONITORIA);
  const aceita = await servico.avaliar(COORDENADORA, doDiego.id, 'ACEITAR');
  conferir('aprovar leva a ACEITA', aceita.status === 'ACEITA', aceita.status);
  conferir('a posicao continua reservada', (await restantes(MONITORIA)) === reservadas);
  conferir(
    'o historico ganha a linha ACEITA',
    (await candidaturas.listarHistorico(doDiego.id)).map((h) => h.status).join() === 'EM_ANALISE,ACEITA'
  );
  const avisoDeAceite = await avisosSobre(DIEGO, 'RESULTADO_DA_AVALIACAO', doDiego.id);
  conferir(
    'o estudante e avisado de que foi aceito',
    avisoDeAceite.length === 1 && avisoDeAceite[0].texto.includes('foi aceita'),
    avisoDeAceite[0]?.texto
  );
  await esperaErro('nao avalia duas vezes', RegraDeNegocio, 'avaliar', () =>
    servico.avaliar(COORDENADORA, doDiego.id, 'RECUSAR')
  );

  const daAna = (await servico.listarDoEstudante(ANA)).find((c) => c.candidatura.vagaId === MONITORIA)!
    .candidatura;
  const antesDeRecusar = await restantes(MONITORIA);
  const recusada = await servico.avaliar(COORDENADORA, daAna.id, 'RECUSAR');
  conferir('recusar leva a RECUSADA', recusada.status === 'RECUSADA', recusada.status);
  conferir(
    'recusar devolve a posicao a vaga',
    (await restantes(MONITORIA)) === antesDeRecusar + 1,
    `antes ${antesDeRecusar}, depois ${await restantes(MONITORIA)}`
  );
  const avisoDeRecusa = await avisosSobre(ANA, 'RESULTADO_DA_AVALIACAO', daAna.id);
  conferir(
    'o estudante e avisado de que nao foi aceito',
    avisoDeRecusa.length === 1 && avisoDeRecusa[0].texto.includes('não foi aceita'),
    avisoDeRecusa[0]?.texto
  );

  await esperaErro('coordenador de outro projeto nao avalia', NaoEncontrado, 'não encontrada', () =>
    servico.avaliar(COORDENADOR_RUI, doDiego.id, 'ACEITAR')
  );
  await esperaErro('estudante nao avalia', SemPermissao, 'apenas coordenadores', () =>
    servico.avaliar(DIEGO, doDiego.id, 'ACEITAR')
  );
  await esperaErro('decisao invalida', RegraDeNegocio, 'ACEITAR ou RECUSAR', () =>
    servico.avaliar(COORDENADORA, doDiego.id, 'TALVEZ' as any)
  );

  // Duas avaliacoes da mesma candidatura disparadas juntas: so uma vale, e a
  // outra encontra a candidatura ja avaliada. ATENCAO: o PGlite tem uma
  // conexao so e roda as transacoes uma de cada vez, entao isto confere a
  // regra do State sob pedidos simultaneos, NAO a trava (SELECT ... FOR
  // UPDATE) de buscarParaAtualizacao. A trava so e exercitada num PostgreSQL
  // de verdade, com varias conexoes.
  const disputada = daCarlaDias;
  const antesDaDisputa = await restantes(disputada.vagaId);
  const resultados = await Promise.allSettled([
    servico.avaliar(COORDENADOR_RUI, disputada.id, 'ACEITAR'),
    servico.avaliar(COORDENADOR_RUI, disputada.id, 'RECUSAR')
  ]);
  const vencedoras = resultados.filter((r) => r.status === 'fulfilled');
  const perdedora = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  conferir(
    'duas avaliacoes disparadas juntas: so uma vale',
    vencedoras.length === 1 && perdedora?.reason instanceof RegraDeNegocio,
    resultados.map((r) => r.status).join(', ')
  );
  const statusFinal = await statusDe(CARLA_DIAS, disputada.id);
  conferir(
    'a posicao bate com quem venceu',
    (await restantes(disputada.vagaId)) === antesDaDisputa + (statusFinal === 'RECUSADA' ? 1 : 0),
    `${statusFinal}, ${antesDaDisputa} -> ${await restantes(disputada.vagaId)}`
  );
  conferir(
    'o historico tem uma linha so da avaliacao',
    (await candidaturas.listarHistorico(disputada.id)).length === 2
  );

  console.log('\nDupla A - C07 Confirmar ingresso\n');

  const antesDeConfirmar = await restantes(MONITORIA);
  const participacao = await servico.confirmarIngresso(DIEGO, doDiego.id);
  conferir('confirmar leva a CONFIRMADA', (await statusDe(DIEGO, doDiego.id)) === 'CONFIRMADA');
  conferir(
    'cria a participacao no projeto, ligada a candidatura',
    participacao.id > 0 &&
      participacao.projetoId === ROBOTICA &&
      participacao.usuarioId === DIEGO &&
      participacao.candidaturaId === doDiego.id &&
      participacao.cargo === 'Participante' &&
      participacao.estaAtiva()
  );
  const relida = (await participacoes.buscarPorId(participacao.id))!;
  const esperado = formatarDia(somarMesesNoTeste(hojeComoDia(), 6));
  conferir(
    'vaga com duracao: previsto ate = hoje + duracao',
    relida.previstoAte !== null && formatarDia(relida.previstoAte) === esperado,
    `${relida.previstoAte && formatarDia(relida.previstoAte)} (esperado ${esperado})`
  );
  conferir('a posicao continua ocupada', (await restantes(MONITORIA)) === antesDeConfirmar);
  conferir(
    'entra na equipe do projeto',
    (await participacoes.listarDoProjeto(ROBOTICA)).some((p) => p.participacao.usuarioId === DIEGO)
  );
  conferir(
    'passa a poder postar atividade (vinculado)',
    await participacoes.estaVinculado(DIEGO, ROBOTICA)
  );
  conferir(
    'o coordenador e avisado (CONFIRMACAO_DE_INGRESSO)',
    (await avisosSobre(COORDENADORA, 'CONFIRMACAO_DE_INGRESSO', doDiego.id)).length === 1
  );
  conferir(
    'o historico termina em CONFIRMADA',
    (await candidaturas.listarHistorico(doDiego.id)).map((h) => h.status).join() ===
      'EM_ANALISE,ACEITA,CONFIRMADA'
  );
  await esperaErro('nao confirma duas vezes', RegraDeNegocio, 'confirmar', () =>
    servico.confirmarIngresso(DIEGO, doDiego.id)
  );
  await esperaErro('confirmada nao e removida', RegraDeNegocio, 'remover', () =>
    servico.remover(DIEGO, doDiego.id)
  );

  console.log('\nCandidatura aceita do seed (Bruno, sem duracao)');
  const doBruno = await servico.confirmarIngresso(BRUNO, doBrunoNaComunicacao.id);
  conferir(
    'vaga sem duracao: participacao sem data prevista',
    doBruno.projetoId === SAUDE_DIGITAL && doBruno.previstoAte === null
  );
  conferir(
    'aparece em Meus Projetos',
    (await participacoes.listarDoUsuario(BRUNO)).some((p) => p.projetoId === SAUDE_DIGITAL)
  );

  console.log('\nDupla A - C18 Remover candidatura\n');

  const aRemover = await servico.candidatar(DIEGO, COMUNICACAO, null);
  const comElaReservada = await restantes(COMUNICACAO);
  await esperaErro('outro estudante nao remove', NaoEncontrado, 'não encontrada', () =>
    servico.remover(ANA, aRemover.id)
  );
  await servico.remover(DIEGO, aRemover.id);
  conferir(
    'remover devolve a posicao a vaga',
    (await restantes(COMUNICACAO)) === comElaReservada + 1
  );
  conferir(
    'some da lista do estudante',
    !(await servico.listarDoEstudante(DIEGO)).some((c) => c.candidatura.id === aRemover.id)
  );
  conferir(
    'some da lista do coordenador',
    !(await servico.listarRecebidas(COORDENADOR_RUI)).some((r) => r.candidatura.id === aRemover.id)
  );
  await esperaErro('o coordenador nao abre a removida pelo id', NaoEncontrado, 'não encontrada', () =>
    servico.detalharRecebida(COORDENADOR_RUI, aRemover.id)
  );
  const removida = await servico.detalhar(DIEGO, aRemover.id);
  conferir(
    'o estudante ainda abre a dele, como REMOVIDA, com a linha no historico',
    removida.candidatura.candidatura.status === 'REMOVIDA' &&
      removida.historico[removida.historico.length - 1]?.status === 'REMOVIDA'
  );
  await esperaErro('nao remove duas vezes', RegraDeNegocio, 'remover', () =>
    servico.remover(DIEGO, aRemover.id)
  );
  const deNovo = await servico.candidatar(DIEGO, COMUNICACAO, 'Mudei de ideia.');
  conferir('depois de remover, pode se candidatar de novo a mesma vaga', deNovo.id !== aRemover.id);

  console.log('\nDupla A - Candidaturas ativas do usuario (para o C14)\n');

  const ativas = await banco.unidade.emTransacao((tx) => candidaturas.listarAtivasDoUsuario(DIEGO, tx));
  conferir(
    'so EM_ANALISE e ACEITA',
    ativas.length > 0 &&
      ativas.every((c) => c.status === 'EM_ANALISE' || c.status === 'ACEITA') &&
      ativas.some((c) => c.id === deNovo.id) &&
      !ativas.some((c) => c.id === doDiego.id || c.id === aRemover.id),
    ativas.map((c) => `${c.id}:${c.status}`).join(', ')
  );

  console.log('\nDupla A - C07 de quem entrou na equipe depois de se candidatar\n');

  // A candidatura nova do Diego e aceita. Antes de ele confirmar, ele entra
  // na equipe da Saude Digital por outro caminho (como as participacoes do
  // seed). A confirmacao tem de ser recusada sem gravar nada.
  await servico.avaliar(COORDENADOR_RUI, deNovo.id, 'ACEITAR');
  await banco.unidade.emTransacao((tx) =>
    participacoes.inserir(
      new Participacao(0, SAUDE_DIGITAL, DIEGO, null, 'Voluntário', new Date(), null, null, null),
      tx
    )
  );
  const participacoesDoDiego = (await participacoes.listarDoUsuario(DIEGO)).length;
  const historicoDoDiego = (await candidaturas.listarHistorico(deNovo.id)).length;
  await esperaErro('confirmar quem ja esta na equipe do projeto', RegraDeNegocio, 'já faz parte', () =>
    servico.confirmarIngresso(DIEGO, deNovo.id)
  );
  conferir(
    'a recusa nao grava nada (continua aceita, sem participacao nova)',
    (await statusDe(DIEGO, deNovo.id)) === 'ACEITA' &&
      (await participacoes.listarDoUsuario(DIEGO)).length === participacoesDoDiego &&
      (await candidaturas.listarHistorico(deNovo.id)).length === historicoDoDiego
  );

  console.log('\nDupla A - C07 fluxo 2.a: declinar o ingresso\n');

  // Sem poder confirmar, o Diego declina: e a saida que libera a posicao.
  const motivo = 'Já entrei na equipe por outro caminho.';
  const antesDeDeclinar = await restantes(COMUNICACAO);
  await servico.declinarIngresso(DIEGO, deNovo.id, motivo);
  const declinada = await servico.detalhar(DIEGO, deNovo.id);
  conferir('declinar leva a DECLINADA', declinada.candidatura.candidatura.status === 'DECLINADA');
  conferir('o motivo fica gravado', declinada.candidatura.candidatura.motivoDeclinio === motivo);
  conferir(
    'e aparece na linha do tempo, para a coordenacao ler',
    declinada.historico[declinada.historico.length - 1]?.observacao === motivo
  );
  conferir(
    'declinar devolve a posicao a vaga',
    (await restantes(COMUNICACAO)) === antesDeDeclinar + 1,
    `antes ${antesDeDeclinar}, depois ${await restantes(COMUNICACAO)}`
  );
  conferir(
    'o coordenador e avisado (DECLINIO_DE_INGRESSO)',
    (await avisosSobre(COORDENADOR_RUI, 'DECLINIO_DE_INGRESSO', deNovo.id)).length === 1
  );
  await esperaErro('nao declina duas vezes', RegraDeNegocio, 'declinar', () =>
    servico.declinarIngresso(DIEGO, deNovo.id, null)
  );
  await esperaErro('nao confirma a de outro estudante', NaoEncontrado, 'não encontrada', () =>
    servico.confirmarIngresso(ANA, doDiego.id)
  );

  console.log('\nDupla A - O banco tambem garante\n');

  /** "codigo:restricao" do erro do banco, para conferir QUAL regra barrou. */
  const violacao = async (acao: () => Promise<unknown>) => {

    try {
      await acao();
      return 'nenhum erro';
    } catch (erro) {
      const { code, constraint } = erro as { code?: string; constraint?: string };
      return code ? `${code}:${constraint}` : (erro as Error).message;
    }

  };
  const candidaturaViva = await violacao(() =>
    banco.unidade.emTransacao((tx) => candidaturas.inserir(DIEGO, COMUNICACAO, null, tx))
  );
  conferir(
    'duas candidaturas vivas do mesmo estudante na mesma vaga',
    candidaturaViva === '23505:uq_candidatura_nao_removida',
    candidaturaViva
  );
  // Bruno nao esta na Robotica: so o indice da candidatura pode barrar.
  const mesmaCandidatura = await violacao(() =>
    banco.unidade.emTransacao((tx) =>
      participacoes.inserir(
        new Participacao(0, ROBOTICA, BRUNO, doBrunoNaComunicacao.id, 'Outra', new Date(), null, null, null),
        tx
      )
    )
  );
  conferir(
    'duas participacoes vindas da mesma candidatura',
    mesmaCandidatura === '23505:uq_participacao_candidatura',
    mesmaCandidatura
  );
  const alemDoTotal = await violacao(() =>
    banco.unidade.emTransacao(async (tx) => {

      const vaga = (await vagas.buscarPorId(MONITORIA, tx))!;
      for (let i = vaga.vagasRestantes; i <= vaga.vagasTotais; i++) {
        await vagas.liberarUmaPosicao(MONITORIA, tx);
      }

    })
  );
  conferir('posicao devolvida alem do total da vaga', alemDoTotal === '23514:vaga_check', alemDoTotal);
  // Duas confirmacoes simultaneas no mesmo projeto passam as duas pela
  // conferencia da equipe; o indice barra a segunda, com a mensagem certa.
  await esperaErro(
    'participacao ativa repetida vira mensagem de negocio, nao "ja se candidatou"',
    RegraDeNegocio,
    'já faz parte',
    () =>
      banco.unidade.emTransacao((tx) =>
        participacoes.inserir(
          new Participacao(0, SAUDE_DIGITAL, ANA, null, 'Outra', new Date(), null, null, null),
          tx
        )
      )
  );

}

/** Mesma regra do servico, escrita de novo aqui para conferir o resultado. */
function somarMesesNoTeste(dia: Date, meses: number): Date {

  const alvo = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();

  return new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(dia.getUTCDate(), ultimo)));

}
