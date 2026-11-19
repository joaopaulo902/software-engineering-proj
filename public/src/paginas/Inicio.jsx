import { api } from '../servicos-api';
import { useDados } from '../contexto';
import { navegar } from '../navegacao';
import { Aviso, Carregando, ErroDaTela } from '../componentes/Avisos';
import { Icone } from '../componentes/Icones';
import { dataBr, diaBr } from '../formatos';

/** Quantos itens o feed mostra. A busca completa, com filtros, fica em Vagas abertas (C01). */
const LIMITE = 30;

function instante(valor) {
  const tempo = Date.parse(valor ?? '');
  return Number.isNaN(tempo) ? 0 : tempo;
}

/** Vagas e atividades numa lista so, da mais recente para a mais antiga. */
function montarFeed(vagas, atividades) {
  const itens = [
    ...vagas.map((vaga) => ({ tipo: 'vaga', chave: `vaga-${vaga.id}`, quando: vaga.publicadaEm, vaga })),
    ...atividades.map((atividade) => ({
      tipo: 'atividade', chave: `atividade-${atividade.id}`, quando: atividade.publicadaEm, atividade
    }))
  ];
  itens.sort((a, b) => instante(b.quando) - instante(a.quando));
  return itens.slice(0, LIMITE);
}

/** Texto curto para o card: corta no limite sem quebrar palavra. */
function resumir(texto, limite) {
  if (!texto || texto.length <= limite) return texto;
  const corte = texto.slice(0, limite);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : limite)}…`;
}

/**
 * Pagina inicial: o feed de vagas e atividades dos projetos, como no
 * prototipo "Feed de Vagas/Atividades de projetos".
 */
export function Inicio() {
  const { carregando, dados, erro } = useDados(async () => {
    const [vagas, atividades] = await Promise.all([
      api.vagas({ ordenarPor: 'PUBLICACAO' }),
      api.atividades()
    ]);
    return montarFeed(vagas ?? [], Array.isArray(atividades) ? atividades : []);
  });

  if (carregando) return <Carregando>Carregando o feed…</Carregando>;
  if (erro) return <ErroDaTela erro={erro} />;

  // As atividades ocupam duas linhas e alternam de lado, como no prototipo.
  let atividades = 0;

  return (
    <div className="inicio">
      <div className="inicio__topo">
        <h2>Feed de vagas e atividades dos projetos</h2>
        <a className="botao" href="#/vagas">Buscar e filtrar vagas</a>
      </div>

      {dados.length === 0 ? (
        <Aviso>Ainda não há vagas abertas nem atividades publicadas.</Aviso>
      ) : (
        <div className="feed">
          {dados.map((item) => {
            if (item.tipo === 'vaga') return <CardDaVagaNoFeed key={item.chave} vaga={item.vaga} />;
            const lado = atividades++ % 2 === 0 ? 'esquerda' : 'direita';
            return <CardDaAtividadeNoFeed key={item.chave} atividade={item.atividade} lado={lado} />;
          })}
        </div>
      )}
    </div>
  );
}

/** Vaga postada: projeto, areas, descricao e responsavel. O card abre Detalhes da Vaga (C03). */
function CardDaVagaNoFeed({ vaga }) {
  const endereco = `/vagas/${vaga.id}`;

  // O card inteiro leva a vaga; os chips de projeto e responsavel levam aos deles.
  function abrir(evento) {
    if (!evento.target.closest('a')) navegar(endereco);
  }

  return (
    <article className="card card--hover feed-vaga" onClick={abrir}>
      <header className="feed-vaga__topo">
        <div>
          <span className="feed__tipo">Vaga</span>
          <h3><a className="feed__titulo" href={`#${endereco}`}>{vaga.titulo}</a></h3>
        </div>
        <a className="chip chip--projeto" href={`#/projetos/${vaga.projetoId}`} title="Abrir o projeto">
          {vaga.projetoNome}
        </a>
      </header>

      {vaga.areasTematicas?.length > 0 && (
        <div className="vaga-areas">
          {vaga.areasTematicas.map((area) => (
            <span className="etiqueta etiqueta--aceita" key={area}>{area}</span>
          ))}
        </div>
      )}

      {vaga.descricao && <p className="feed-vaga__descricao">{resumir(vaga.descricao, 160)}</p>}

      <footer className="feed__rodape">
        <span className="chip chip--pessoa">Responsável: {vaga.coordenadorNome}</span>
        <span>até {dataBr(vaga.dataEncerramento)}</span>
      </footer>
    </article>
  );
}

/** Atividade de projeto: nome do projeto, foto e descricao. Leva a Pagina do Projeto. */
function CardDaAtividadeNoFeed({ atividade, lado }) {
  const classes = ['card', 'feed-atividade', `feed-atividade--${lado}`];
  const projeto = atividade.projetoNome || `Projeto #${atividade.projetoId}`;

  return (
    <article className={classes.join(' ')}>
      <header>
        <span className="feed__tipo feed__tipo--atividade">Atividade</span>
        <h3><a className="feed__titulo" href={`#/projetos/${atividade.projetoId}`}>{projeto}</a></h3>
      </header>
      {atividade.fotoUrl ? (
        <img className="feed-atividade__foto" src={atividade.fotoUrl} alt="" />
      ) : (
        // Sem foto: o espaco fica, para o card manter o desenho do prototipo.
        <div className="feed-atividade__foto feed-atividade__foto--vazia" aria-hidden="true">
          <Icone nome="projetos" />
        </div>
      )}
      <p className="feed-atividade__titulo">{atividade.titulo}</p>
      {atividade.descricao && <p className="texto-longo">{resumir(atividade.descricao, 280)}</p>}
      <footer className="feed__rodape">
        <span>{atividade.autorNome ? `Por ${atividade.autorNome}` : ''}</span>
        <span>{diaBr(atividade.publicadaEm)}</span>
      </footer>
    </article>
  );
}
