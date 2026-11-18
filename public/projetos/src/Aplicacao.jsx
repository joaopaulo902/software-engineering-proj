import { useEffect, useState } from 'react';
import { api } from './servicos-api';
import { Notificacoes } from './componentes/Notificacoes';
import { ListaDeProjetos } from './paginas/ListaDeProjetos';
import { MeusProjetos } from './paginas/MeusProjetos';
import { FeedDeAtividades } from './paginas/FeedDeAtividades';
import { DetalhesDoProjeto } from './paginas/DetalhesDoProjeto';

export default function Aplicacao() {
  const [usuario, setUsuario] = useState(null);
  const [aba, setAba] = useState('projetos');
  const [projetoId, setProjetoId] = useState(null);
  const [meusProjetos, setMeusProjetos] = useState([]);

  async function atualizarParticipacoes() {
    try {
      setMeusProjetos(await api.meusProjetos());
    } catch {
      setMeusProjetos([]);
    }
  }

  async function selecionarSessao(id) {
    const dados = await api.entrar(id);
    setUsuario(dados);
    await atualizarParticipacoes();
  }

  useEffect(() => {
    async function iniciar() {
      let id = 2;
      try {
        const sessao = await api.sessao();
        if (sessao?.id) id = sessao.id;
      } catch {
        // Usa a Profa. Carla quando não há sessão aberta.
      }
      await selecionarSessao(id);
      await atualizarParticipacoes();

      const pedido = new URLSearchParams(location.search);
      if (pedido.get('projeto')) {
        setProjetoId(Number(pedido.get('projeto')));
        setAba('detalhe');
      } else if (pedido.get('aba') === 'meus-projetos') {
        setAba('meus-projetos');
      } else if (pedido.get('aba') === 'feed') {
        setAba('feed');
      } else if (pedido.get('notificacoes')) {
        setAba('projetos');
      }
    }
    iniciar();
  }, []);

  function abrirProjeto(id) {
    setProjetoId(Number(id));
    setAba('detalhe');
  }

  function mudarAba(novaAba) {
    setAba(novaAba);
  }

  return (
    <main className="pagina pagina-projetos">
      <header className="barra">
        <div>
          <h1 className="titulo">Extensão INF</h1>
          <span className="papel">{usuario ? `${usuario.nome} · ${usuario.papel}` : 'Projetos de Extensão'}</span>
        </div>
        <div className="barra__acoes">
          <select className="seletor-sessao" value={usuario?.id || 2} onChange={(event) => selecionarSessao(Number(event.target.value))}>
            <option value="2">2 - Profa. Carla</option>
            <option value="3">3 - Prof. Rui</option>
            <option value="6">6 - Carla Dias</option>
          </select>
          <Notificacoes aoAbrirProjeto={abrirProjeto} />
          <button className="botao" type="button" title="Perfil">Perfil</button>
        </div>
      </header>

      {aba !== 'detalhe' && (
        <nav className="abas" aria-label="Seções">
          <button className={`aba ${aba === 'projetos' ? 'aba--ativa' : ''}`} type="button" onClick={() => mudarAba('projetos')}>Projetos</button>
          <button className={`aba ${aba === 'meus-projetos' ? 'aba--ativa' : ''}`} type="button" onClick={() => mudarAba('meus-projetos')}>Meus Projetos</button>
          <button className={`aba ${aba === 'feed' ? 'aba--ativa' : ''}`} type="button" onClick={() => mudarAba('feed')}>Feed de Atividades</button>
        </nav>
      )}

      {aba === 'projetos' && <ListaDeProjetos aoAbrirProjeto={abrirProjeto} />}
      {aba === 'meus-projetos' && <MeusProjetos participacoes={meusProjetos} aoAbrirProjeto={abrirProjeto} />}
      {aba === 'feed' && <FeedDeAtividades aoAbrirProjeto={abrirProjeto} />}
      {aba === 'detalhe' && projetoId && (
        <DetalhesDoProjeto
          projetoId={projetoId}
          usuarioId={usuario?.id}
          meusProjetos={meusProjetos}
          aoVoltar={() => mudarAba('projetos')}
          aoAlterar={atualizarParticipacoes}
        />
      )}
    </main>
  );
}
