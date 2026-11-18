import { useEffect, useState } from 'react';
import { api } from './servicos-api';
import { ListaDeProjetos } from './paginas/ListaDeProjetos';
import { MeusProjetos } from './paginas/MeusProjetos';
import { FeedDeAtividades } from './paginas/FeedDeAtividades';
import { DetalhesDoProjeto } from './paginas/DetalhesDoProjeto';
import { SolicitarIncorporacao } from './paginas/SolicitarIncorporacao';
import { AvaliarIncorporacoes } from './paginas/AvaliarIncorporacoes';
import { VagasAbertas } from './paginas/VagasAbertas';
import { DetalhesDaVaga } from './paginas/DetalhesDaVaga';
import { OfertarVaga } from './paginas/OfertarVaga';

export default function Aplicacao() {
  const [usuario, setUsuario] = useState(null);
  const [aba, setAba] = useState('projetos');
  const [projetoId, setProjetoId] = useState(null);
  const [vagaId, setVagaId] = useState(null); // frente C
  const [projetoDaVaga, setProjetoDaVaga] = useState(null); // frente C
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [incorporacoesPendentes, setIncorporacoesPendentes] = useState([]);
  const [erro, setErro] = useState('');

  async function atualizarParticipacoes(papel = usuario?.papel) {
    try {
      const [participacoes, pedidos] = await Promise.all([
        api.meusProjetos(),
        papel === 'COORDENADOR' ? api.minhasIncorporacoesPendentes() : Promise.resolve([])
      ]);
      setMeusProjetos(participacoes);
      setIncorporacoesPendentes(pedidos);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  useEffect(() => {
    async function iniciar() {
      try {
        const sessao = await api.sessao();
        setUsuario(sessao);
        await atualizarParticipacoes(sessao.papel);
      } catch (falha) {
        setErro(falha.message);
      }

      const pedido = new URLSearchParams(location.search);
      if (pedido.get('projeto')) {
        setProjetoId(Number(pedido.get('projeto')));
        setAba('detalhe');
      } else if (pedido.get('aba') === 'meus-projetos') {
        setAba('meus-projetos');
      } else if (pedido.get('aba') === 'feed') {
        setAba('feed');
      } else if (pedido.get('aba') === 'avaliar-incorporacoes') {
        setAba('avaliar-incorporacoes');
      } else if (pedido.get('vaga')) { // frente C: Detalhes da Vaga (C03)
        setVagaId(Number(pedido.get('vaga')));
        setAba('vaga');
      } else if (pedido.get('aba') === 'vagas') { // frente C: Vagas abertas (C01)
        setAba('vagas');
      } else if (pedido.get('aba') === 'ofertar-vaga') { // frente C: Ofertar nova vaga (C06)
        setProjetoDaVaga(Number(pedido.get('projetoDaVaga')) || null);
        setAba('ofertar-vaga');
      }
    }
    iniciar();
  }, []);

  function abrirProjeto(id) {
    setProjetoId(Number(id));
    setAba('detalhe');
  }

  return (
    <main className="pagina pagina-projetos">
      {erro && <p className="aviso aviso--erro">{erro}</p>}

      {!['detalhe', 'incorporar-projeto', 'avaliar-incorporacoes', 'vagas', 'vaga', 'ofertar-vaga'].includes(aba) && (
        <nav className="abas" aria-label="Seções">
          <button className={`aba ${aba === 'projetos' ? 'aba--ativa' : ''}`} type="button" onClick={() => setAba('projetos')}>Projetos</button>
          <button className={`aba ${aba === 'meus-projetos' ? 'aba--ativa' : ''}`} type="button" onClick={() => setAba('meus-projetos')}>Meus Projetos</button>
          <button className={`aba ${aba === 'feed' ? 'aba--ativa' : ''}`} type="button" onClick={() => setAba('feed')}>Feed de Atividades</button>
        </nav>
      )}

      {aba === 'projetos' && <ListaDeProjetos aoAbrirProjeto={abrirProjeto} />}
      {aba === 'meus-projetos' && (
        <MeusProjetos
          participacoes={meusProjetos}
          pedidosPendentes={incorporacoesPendentes}
          aoAbrirProjeto={abrirProjeto}
          ehCoordenador={usuario?.papel === 'COORDENADOR'}
          aoIncorporar={() => setAba('incorporar-projeto')}
        />
      )}
      {aba === 'feed' && <FeedDeAtividades aoAbrirProjeto={abrirProjeto} />}
      {aba === 'detalhe' && projetoId && (
        <DetalhesDoProjeto
          projetoId={projetoId}
          usuarioId={usuario?.id}
          meusProjetos={meusProjetos}
          aoVoltar={() => setAba('projetos')}
          aoAlterar={atualizarParticipacoes}
        />
      )}
      {aba === 'incorporar-projeto' && (
        usuario?.papel === 'COORDENADOR' ? (
          <SolicitarIncorporacao
            aoVoltar={() => setAba('meus-projetos')}
            aoSolicitar={atualizarParticipacoes}
          />
        ) : (
          <p className="aviso aviso--erro">Apenas coordenadores podem solicitar a incorporação de projetos.</p>
        )
      )}
      {aba === 'avaliar-incorporacoes' && (
        usuario?.papel === 'ADMIN' ? (
          <AvaliarIncorporacoes />
        ) : (
          <p className="aviso aviso--erro">Apenas administradores podem avaliar solicitações de incorporação.</p>
        )
      )}

      {/* frente C: vagas */}
      {aba === 'vagas' && <VagasAbertas usuario={usuario} />}
      {aba === 'vaga' && vagaId && <DetalhesDaVaga vagaId={vagaId} usuario={usuario} />}
      {aba === 'ofertar-vaga' && usuario && <OfertarVaga usuario={usuario} projetoInicial={projetoDaVaga} />}
    </main>
  );
}
