// Tela "Minhas candidaturas" do estudante: C05 - Acompanhar Status das Candidaturas.
// Cada card leva a tela "Minha candidatura".

import { useState } from 'react';
import { api } from '../servicos-api';
import { useDados } from '../contexto';
import { normalizar } from '../formatos';
import { Aviso, Carregando, ErroDaTela } from '../componentes/Avisos';
import { BarraDeFiltro, CardDeCandidatura } from '../componentes/Candidatura';

const STATUS_DO_FILTRO = ['EM_ANALISE', 'ACEITA', 'CONFIRMADA', 'RECUSADA', 'DECLINADA'];

export function MinhasCandidaturas() {
  const { carregando, dados: candidaturas, erro } = useDados(() => api.minhasCandidaturas());
  const [termo, setTermo] = useState('');
  const [status, setStatus] = useState([]);

  if (carregando) return <Carregando />;
  if (erro) return <ErroDaTela erro={erro} />;

  // Pre-condicao do C05: ter ao menos uma candidatura. Sem nenhuma, a tela
  // diz qual e o proximo passo em vez de mostrar uma lista vazia.
  if (candidaturas.length === 0) {
    return (
      <section className="vazio">
        <h2>Você ainda não se candidatou a nenhuma vaga</h2>
        <p>As vagas com inscrição aberta estão em Vagas abertas.</p>
        <a className="botao botao--primario" href="#/vagas">Ver vagas abertas</a>
      </section>
    );
  }

  // A lista do estudante e pequena e ja veio inteira: o filtro roda aqui
  // mesmo, sem ir de novo ao servidor.
  const procurado = normalizar(termo);
  const visiveis = candidaturas.filter((c) => {
    if (status.length > 0 && !status.includes(c.status)) return false;
    if (!procurado) return true;
    return normalizar(`${c.vagaTitulo} ${c.projetoNome} ${c.coordenadorNome}`).includes(procurado);
  });

  return (
    <>
      <BarraDeFiltro
        dica="Pesquisar por vaga, projeto ou professor"
        statusDisponiveis={STATUS_DO_FILTRO}
        termo={termo}
        aoMudarTermo={setTermo}
        status={status}
        aoMudarStatus={setStatus}
      />
      <div className="lista">
        {visiveis.length ? (
          visiveis.map((item) => <CardDeCandidatura key={item.id} item={item} />)
        ) : (
          <Aviso tipo="info">Nenhuma candidatura com esses filtros.</Aviso>
        )}
      </div>
    </>
  );
}
