import { api } from '../servicos-api';
import { useDados } from '../contexto';
import { navegar } from '../navegacao';
import { Aviso, Carregando, ErroDaTela } from '../componentes/Avisos';
import { dataBr, diaBr } from '../formatos';

/** Quantos itens cada coluna mostra. A busca completa, com filtros, fica em Vagas abertas (C01). */
const LIMITE_DE_VAGAS = 12;
const LIMITE_DE_ATIVIDADES = 8;

function instante(valor) {
  const tempo = Date.parse(valor ?? '');
  return Number.isNaN(tempo) ? 0 : tempo;
}

/** "há 3 horas", "há 2 dias"; depois de um mes, a data. */
function haQuantoTempo(valor) {
  const tempo = instante(valor);
  if (!tempo) return '';
  const minutos = Math.max(0, Math.round((Date.now() - tempo) / 60000));
  if (minutos < 60) return minutos <= 1 ? 'agora há pouco' : `há ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? 'há 1 hora' : `há ${horas} horas`;
  const dias = Math.round(horas / 24);
  if (dias <= 30) return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
  return `em ${diaBr(valor)}`;
}

/** Texto curto para o card: corta no limite sem quebrar palavra. */
function resumir(texto, limite) {
  if (!texto || texto.length <= limite) return texto;
  const corte = texto.slice(0, limite);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : limite)}…`;
}

/**
 * Pagina inicial: as vagas abertas e as atividades dos projetos, as mais
 * recentes primeiro, lado a lado (prototipo "Feed de Vagas/Atividades de
 * projetos", no layout aprovado pelo grupo).
 */
export function Inicio() {
  const { carregando, dados, erro } = useDados(async () => {
    const [vagas, atividades] = await Promise.all([
      api.vagas({ ordenarPor: 'PUBLICACAO' }),
      api.atividades()
    ]);
    const lista = Array.isArray(atividades) ? [...atividades] : [];
    lista.sort((a, b) => instante(b.publicadaEm) - instante(a.publicadaEm));
    return {
      vagas: (vagas ?? []).slice(0, LIMITE_DE_VAGAS),
      atividades: lista.slice(0, LIMITE_DE_ATIVIDADES)
    };
  });

  if (carregando) return <Carregando>Carregando o feed…</Carregando>;
  if (erro) return <ErroDaTela erro={erro} />;

  return (
    <div className="inicio">
      <div className="inicio__topo">
        <p>As vagas abertas e as atividades mais recentes dos projetos de extensão.</p>
        <a className="botao" href="#/vagas">Buscar e filtrar vagas</a>
      </div>

      <div className="inicio__colunas">
        <section aria-labelledby="inicio-vagas">
          <h2 className="titulo-secao" id="inicio-vagas">Vagas abertas</h2>
          {dados.vagas.length === 0 ? (
            <Aviso>Nenhuma vaga aberta no momento.</Aviso>
          ) : (
            <div className="inicio__pilha">
              {dados.vagas.map((vaga) => <CardDaVagaNoFeed key={vaga.id} vaga={vaga} />)}
            </div>
          )}
        </section>

        <section aria-labelledby="inicio-atividades">
          <h2 className="titulo-secao" id="inicio-atividades">Atividades dos projetos</h2>
          {dados.atividades.length === 0 ? (
            <Aviso>Os projetos ainda não publicaram atividades.</Aviso>
          ) : (
            <div className="inicio__pilha">
              {dados.atividades.map((atividade) => (
                <CardDaAtividadeNoFeed key={atividade.id} atividade={atividade} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Vaga postada: projeto, areas, descricao e responsavel. O card abre Detalhes da Vaga (C03). */
function CardDaVagaNoFeed({ vaga }) {
  const endereco = `/vagas/${vaga.id}`;

  // O card inteiro leva a vaga; o projeto e o responsavel levam aos deles.
  function abrir(evento) {
    if (!evento.target.closest('a')) navegar(endereco);
  }

  return (
    <article className="card card--hover feed-vaga" onClick={abrir}>
      <div className="feed-card__corpo">
        <div className="feed-vaga__topo">
          <p className="feed__rotulo">Publicada {haQuantoTempo(vaga.publicadaEm)}</p>
          <a className="chip chip--projeto" href={`#/projetos/${vaga.projetoId}`} title="Abrir o projeto">
            {vaga.projetoNome}
          </a>
        </div>
        <h3><a className="feed__titulo" href={`#${endereco}`}>{vaga.titulo}</a></h3>
        <p className="feed__meta">
          {vaga.cargaHoraria}h semanais · {vaga.turno} · {vaga.modalidade} · {vaga.beneficio}
        </p>
        {vaga.areasTematicas?.length > 0 && (
          <div className="vaga-areas">
            {vaga.areasTematicas.map((area) => <span className="etiqueta etiqueta--area" key={area}>{area}</span>)}
          </div>
        )}
        {vaga.descricao && <p className="feed__descricao">{resumir(vaga.descricao, 200)}</p>}
      </div>
      <footer className="feed__rodape">
        <span>
          Responsável:{' '}
          <a className="feed__pessoa" href={`#/usuarios/${vaga.coordenadorId}`} title="Ver o perfil">
            {vaga.coordenadorNome}
          </a>
        </span>
        <span className="feed__prazo">Inscrições até {dataBr(vaga.dataEncerramento)}</span>
      </footer>
    </article>
  );
}

/** Atividade de projeto: foto, projeto e descricao. O nome do projeto leva a Pagina do Projeto. */
function CardDaAtividadeNoFeed({ atividade }) {
  const projeto = atividade.projetoNome || `Projeto #${atividade.projetoId}`;

  return (
    <article className="card feed-atividade">
      {atividade.fotoUrl ? (
        <img className="feed-atividade__foto" src={atividade.fotoUrl} alt="" />
      ) : (
        <div className="feed-atividade__foto feed-atividade__foto--vazia" aria-hidden="true">Sem foto</div>
      )}
      <div className="feed-card__corpo">
        <p className="feed__rotulo"><a href={`#/projetos/${atividade.projetoId}`}>{projeto}</a></p>
        <h3>{atividade.titulo}</h3>
        {atividade.descricao && <p className="feed__descricao">{resumir(atividade.descricao, 240)}</p>}
      </div>
      <footer className="feed__rodape">
        <span>{atividade.autorNome ? `Por ${atividade.autorNome}` : ''}</span>
        <span>{diaBr(atividade.publicadaEm)}</span>
      </footer>
    </article>
  );
}
