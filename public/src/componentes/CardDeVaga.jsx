import { dataBr } from '../formatos';

/**
 * Card de vaga (C01): titulo, projeto, responsavel, areas e um resumo.
 * O card inteiro abre Detalhes da Vaga; a candidatura e feita la (C04),
 * entao nao ha botao de candidatura aqui.
 */
export function CardDeVaga({ vaga, aoAbrir }) {
  const resumo = vaga.descricao?.length > 180 ? `${vaga.descricao.slice(0, 177)}…` : vaga.descricao;

  function abrirPeloTeclado(evento) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      aoAbrir(vaga.id);
    }
  }

  return (
    <article
      className="card card--hover"
      role="button"
      tabIndex={0}
      onClick={() => aoAbrir(vaga.id)}
      onKeyDown={abrirPeloTeclado}
    >
      <header className="card__topo">
        <div>
          <h3>{vaga.titulo}</h3>
          <p className="card__projeto">{vaga.projetoNome}</p>
        </div>
        <span className={`contador ${vaga.vagasRestantes === 0 ? 'contador--zero' : ''}`}>
          {vaga.vagasRestantes} de {vaga.vagasTotais}
        </span>
      </header>

      {vaga.areasTematicas?.length > 0 && (
        <div className="vaga-areas">
          {vaga.areasTematicas.map((area) => (
            <span className="etiqueta etiqueta--aceita" key={area}>{area}</span>
          ))}
        </div>
      )}

      {resumo && <p className="card__requisitos">{resumo}</p>}

      <ul className="atributos">
        <li>{vaga.cargaHoraria}h semanais</li>
        <li>{vaga.turno}</li>
        <li>{vaga.modalidade}</li>
        <li>{vaga.beneficio}</li>
        <li>inscrições até {dataBr(vaga.dataEncerramento)}</li>
      </ul>

      <div className="card__rodape">
        <span>Responsável: <strong>{vaga.coordenadorNome}</strong></span>
        <span className="link">Ver vaga →</span>
      </div>
    </article>
  );
}
