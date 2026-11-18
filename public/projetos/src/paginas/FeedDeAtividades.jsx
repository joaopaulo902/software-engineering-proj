import { useEffect, useState } from 'react';
import { api } from '../servicos-api';

export function FeedDeAtividades({ aoAbrirProjeto }) {
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.atividades()
      .then((lista) => setAtividades(Array.isArray(lista) ? lista : []))
      .catch(() => setAtividades([]))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <>
      <h2>Feed de Atividades</h2>
      {carregando ? <p className="carregando">A carregar feed…</p> : (
        <div className="lista">
          {atividades.length === 0 ? <p className="aviso aviso--info">Nenhuma atividade no feed.</p> : atividades.map((item) => (
            <article className="card" key={item.id}>
              <header className="card__topo">
                <div>
                  <h3>{item.titulo}</h3>
                  <p className="card__projeto">{item.projetoNome || `Projeto #${item.projetoId}`}{item.projetoArea ? ` · ${item.projetoArea}` : ''}</p>
                </div>
                <button className="botao" type="button" onClick={() => aoAbrirProjeto(item.projetoId)}>Ver projeto</button>
              </header>
              <p className="texto-longo">{item.descricao}</p>
              {(item.fotoUrl || item.foto) && <img className="atividade-foto" src={item.fotoUrl || item.foto} alt="" />}
              <div className="feed-rodape">
                <span>{item.autorNome ? `Por ${item.autorNome}` : ''}</span>
                <span>{item.publicadaEm ? new Date(item.publicadaEm).toLocaleDateString('pt-BR') : 'Recente'}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
