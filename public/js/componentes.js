// Pacote `componentes` do subsistema Cliente Web.
// Pedacos de interface reutilizados por mais de uma tela.

export function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

export function dataBr(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

const ROTULO_STATUS = {
  EM_ANALISE: 'Em análise',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada'
};

export function etiquetaStatus(status) {
  return `<span class="etiqueta etiqueta--${status.toLowerCase()}">${
    ROTULO_STATUS[status] ?? status
  }</span>`;
}

export function cardDeVaga(vaga) {
  const esgotada = vaga.vagasRestantes === 0;
  return `
    <article class="card" data-vaga="${vaga.id}">
      <header class="card__topo">
        <div>
          <h3>${escapar(vaga.titulo)}</h3>
          <p class="card__projeto">${escapar(vaga.projetoNome)} &middot; ${escapar(vaga.projetoArea)}</p>
        </div>
        <span class="contador ${esgotada ? 'contador--zero' : ''}">
          ${vaga.vagasRestantes} de ${vaga.vagasTotais}
        </span>
      </header>

      <p class="card__requisitos">${escapar(vaga.requisitos)}</p>

      <ul class="atributos">
        <li>${vaga.cargaHoraria}h semanais</li>
        <li>${escapar(vaga.turno)}</li>
        <li>${escapar(vaga.modalidade)}</li>
        <li>a partir do ${vaga.semestreMinimo}º semestre</li>
        <li>inscrições até ${dataBr(vaga.dataEncerramento)}</li>
      </ul>

      <p class="card__coordenador">Coordenação: ${escapar(vaga.coordenadorNome)}</p>

      <div class="card__acao">
        <textarea class="mensagem" rows="2"
                  placeholder="Mensagem para a coordenação (opcional)"></textarea>
        <button class="botao botao--primario" data-candidatar="${vaga.id}">
          Candidatar-se
        </button>
      </div>

      <p class="retorno" data-retorno="${vaga.id}"></p>
    </article>`;
}

export function linhaDeCandidatura(item) {
  return `
    <article class="card card--compacto">
      <header class="card__topo">
        <div>
          <h3>${escapar(item.vagaTitulo)}</h3>
          <p class="card__projeto">${escapar(item.projetoNome)}</p>
        </div>
        ${etiquetaStatus(item.status)}
      </header>
      ${item.mensagem ? `<p class="card__requisitos">“${escapar(item.mensagem)}”</p>` : ''}
      <p class="card__coordenador">Enviada em ${dataBr(item.criadaEm)}</p>
    </article>`;
}

export function aviso(texto, tipo = 'info') {
  return `<p class="aviso aviso--${tipo}">${escapar(texto)}</p>`;
}
