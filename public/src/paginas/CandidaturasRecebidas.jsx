// Tela "Candidaturas recebidas" do coordenador: C15 - Visualizar Candidaturas
// dos Aplicantes. Cada card leva a tela "Candidatura" (C11).

import { useEffect, useRef, useState } from 'react';
import { api } from '../servicos-api';
import { useDados } from '../contexto';
import { normalizar } from '../formatos';
import { Aviso, Carregando, ErroDaTela } from '../componentes/Avisos';
import { BarraDeFiltro, CardDeCandidaturaRecebida } from '../componentes/Candidatura';

const STATUS_DO_FILTRO = ['EM_ANALISE', 'ACEITA', 'CONFIRMADA', 'RECUSADA', 'DECLINADA'];

export function CandidaturasRecebidas({ consulta }) {
  // A primeira carga vem sem filtro: serve para saber se ha candidaturas e
  // para montar a lista de vagas do seletor.
  const { carregando, dados: todas, erro } = useDados(() => api.candidaturasRecebidas());

  if (carregando) return <Carregando />;
  if (erro) return <ErroDaTela erro={erro} />;

  // Pre-condicao do C15: ter vaga publicada. Sem candidatura nenhuma, a tela
  // aponta o caminho.
  if (todas.length === 0) {
    return (
      <section className="vazio">
        <h2>Nenhuma candidatura recebida ainda</h2>
        <p>As candidaturas às vagas dos seus projetos aparecem aqui assim que forem enviadas.</p>
        <a className="botao botao--primario" href="#/vagas/nova">Ofertar nova vaga</a>
      </section>
    );
  }

  // Um link pode chegar ja filtrado: #/candidaturas/recebidas?vagaId=3
  return <Lista todas={todas} vagaInicial={Number(consulta.get('vagaId')) || null} />;
}

function Lista({ todas, vagaInicial }) {
  const vagas = new Map();
  todas.forEach((c) => {
    if (c.vagaId) vagas.set(c.vagaId, c.vagaTitulo);
  });

  const [termo, setTermo] = useState('');
  const [status, setStatus] = useState([]);
  const [vagaId, setVagaId] = useState(vagaInicial);
  const [lista, setLista] = useState({ carregando: Boolean(vagaInicial), itens: todas, erro: '' });

  // Vaga e status sao o FiltroDeCandidaturas e vao para o servidor.
  // O texto digitado filtra o que ja chegou, sem nova consulta.
  // Na primeira vez, sem vaga escolhida, a lista e a que ja veio.
  const primeiraVez = useRef(true);
  const chaveDoServidor = JSON.stringify([vagaId, status]);

  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      if (!vagaId) return undefined;
    }
    let atual = true; // descarta a resposta de um filtro antigo
    setLista((anterior) => ({ ...anterior, carregando: true, erro: '' }));
    api.candidaturasRecebidas({ vagaId, status }).then(
      (itens) => atual && setLista({ carregando: false, itens, erro: '' }),
      // Mantem o que o coordenador escolheu na barra; so a lista mostra o erro.
      (falha) => atual && setLista({ carregando: false, itens: [], erro: falha.message })
    );
    return () => {
      atual = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDoServidor]);

  const procurado = normalizar(termo);
  const visiveis = lista.itens.filter(
    (c) =>
      !procurado ||
      normalizar(`${c.estudante?.nome} ${c.vagaTitulo} ${c.projetoNome}`).includes(procurado)
  );
  const emAnalise = visiveis.filter((c) => c.status === 'EM_ANALISE').length;

  return (
    <>
      <BarraDeFiltro
        dica="Pesquisar por estudante ou vaga"
        statusDisponiveis={STATUS_DO_FILTRO}
        termo={termo}
        aoMudarTermo={setTermo}
        status={status}
        aoMudarStatus={setStatus}
        extra={
          <select
            name="vagaId"
            aria-label="Filtrar por vaga"
            value={vagaId ?? ''}
            onChange={(evento) => setVagaId(Number(evento.target.value) || null)}
          >
            <option value="">Todas as vagas</option>
            {[...vagas].map(([id, titulo]) => (
              <option key={id} value={id}>{titulo}</option>
            ))}
          </select>
        }
      />
      <p className="resumo">
        {lista.carregando || lista.erro
          ? ''
          : `${visiveis.length} ${visiveis.length === 1 ? 'candidatura' : 'candidaturas'}` +
            (emAnalise > 0 ? `, ${emAnalise} aguardando sua avaliação` : '')}
      </p>
      <div className="lista">
        {lista.carregando ? (
          <Carregando />
        ) : lista.erro ? (
          <Aviso tipo="erro">{lista.erro}</Aviso>
        ) : visiveis.length ? (
          visiveis.map((item) => <CardDeCandidaturaRecebida key={item.id} item={item} />)
        ) : (
          <Aviso tipo="info">Nenhuma candidatura com esses filtros.</Aviso>
        )}
      </div>
    </>
  );
}
