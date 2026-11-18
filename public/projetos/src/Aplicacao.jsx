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
  const [erro, setErro] = useState('');

  async function atualizarParticipacoes() {
    try {
      setMeusProjetos(await api.meusProjetos());
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function selecionarSessao(id) {
    setErro('');
    try {
      const dados = await api.entrar(id);
      setUsuario(dados);
      await atualizarParticipacoes();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  useEffect(() => {
    async function iniciar() {
      let id = 2;
      try {
        const sessao = await api.sessao();
        if (sessao?.id) id = sessao.id;
      } catch {
        // Sem sessão ativa, inicia com a usuária padrão de demonstração.
      }
      await selecionarSessao(id);

      const pedido = new URLSearchParams(location.search);
      if (pedido.get('projeto')) {
        setProjetoId(Number(pedido.get('projeto')));
        setAba('detalhe');
      } else if (pedido.get('aba') === 'meus-projetos') {
        setAba('meus-projetos');
      } else if (pedido.get('aba') === 'feed') {
        setAba('feed');
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
      <header className="barra">
        <div>
          <h1 className="titulo">Extensão INF</h1>
          <span className="papel">
            {usuario ? `${usuario.nome} · ${usuario.papel}` : 'Projetos de Extensão'}
          </span>
        </div>
        <div className="barra__acoes">
          <select
            className="seletor-sessao"
            aria-label="Selecionar sessão"
            value={usuario?.id || 2}
            onChange={(evento) => selecionarSessao(Number(evento.target.value))}
          >
            <option value="2">2 - Profa. Carla (Coord. Robótica)</option>
            <option value="3">3 - Prof. Rui (Coord. Saúde)</option>
            <option value="6">6 - Carla Dias (Monitora)</option>
          </select>
          <Notificacoes aoAbrirProjeto={abrirProjeto} />
          <button className="botao" type="button" title="Perfil">Perfil</button>
        </div>
      </header>

      {erro && <p className="aviso aviso--erro">{erro}</p>}

      {aba !== 'detalhe' && (
        <nav className="abas" aria-label="Seções">
          <button className={`aba ${aba === 'projetos' ? 'aba--ativa' : ''}`} type="button" onClick={() => setAba('projetos')}>Projetos</button>
          <button className={`aba ${aba === 'meus-projetos' ? 'aba--ativa' : ''}`} type="button" onClick={() => setAba('meus-projetos')}>Meus Projetos</button>
          <button className={`aba ${aba === 'feed' ? 'aba--ativa' : ''}`} type="button" onClick={() => setAba('feed')}>Feed de Atividades</button>
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
          aoVoltar={() => setAba('projetos')}
          aoAlterar={atualizarParticipacoes}
        />
      )}
    </main>
  );
}
