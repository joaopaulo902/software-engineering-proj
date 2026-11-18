import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function FeedDeAtividades({ aoAbrirProjeto }) {
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.atividades()
      .then((resultado) => setAtividades(Array.isArray(resultado) ? resultado : []))
      .catch((falha) => setErro(falha.message))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <>
      <h2>Feed de Atividades</h2>
      {carregando ? (
        <p className="carregando">A carregar feed…</p>
      ) : erro ? (
        <p className="aviso aviso--erro">{erro}</p>
      ) : atividades.length === 0 ? (
        <p className="aviso aviso--info">Nenhuma atividade no feed.</p>
      ) : (
        <div className="lista">
          {atividades.map((atividade) => {
            const nomeProjeto = atividade.projetoNome ||
              (atividade.projetoId ? `Projeto #${atividade.projetoId}` : 'Projeto');
            const foto = atividade.fotoUrl || atividade.foto;
            return (
              <article className="card" key={atividade.id}>
                <header className="card__topo">
                  <div>
                    <h3>{atividade.titulo}</h3>
                    <p className="card__projeto">
                      {nomeProjeto}{atividade.projetoArea ? ` · ${atividade.projetoArea}` : ''}
                    </p>
                  </div>
                  <button
                    className="botao"
                    type="button"
                    onClick={() => aoAbrirProjeto(atividade.projetoId)}
                  >
                    Ver projeto
                  </button>
                </header>
                <p className="texto-longo">{atividade.descricao}</p>
                {foto && <img className="atividade-foto" src={foto} alt="" />}
                <div className="feed-rodape">
                  <span>{atividade.autorNome ? `Por ${atividade.autorNome}` : ''}</span>
                  <span>
                    {atividade.publicadaEm
                      ? new Date(atividade.publicadaEm).toLocaleDateString('pt-BR')
                      : 'Recente'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
