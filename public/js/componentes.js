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

/** Hoje no formato do campo de data ("AAAA-MM-DD"), pelo relogio do navegador. */
function hojeNoFormatoDoCampo() {
  const d = new Date();
  const doisDigitos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/**
 * Formulario do C06.
 *
 * `novalidate` desliga os baloes de validacao do navegador: quem valida e o
 * servidor, e a resposta dele aparece no mesmo lugar e no mesmo estilo dos
 * erros do C04. Os atributos min/max continuam servindo de dica para o
 * calendario e para os campos numericos.
 */
export function formularioDeVaga(projetos) {
  return `
    <form class="card formulario" id="formVaga" novalidate>
      <div>
        <h2>Publicar vaga</h2>
        <p class="formulario__nota">
          A vaga aparece em <strong>Vagas abertas</strong> assim que for publicada
          e passa a aceitar candidaturas até a data de encerramento.
        </p>
      </div>

      <div class="campo">
        <label for="projetoId">Projeto</label>
        <select id="projetoId" name="projetoId">
          ${projetos
            .map((p) => `<option value="${p.id}">${escapar(p.nome)} — ${escapar(p.area)}</option>`)
            .join('')}
        </select>
      </div>

      <div class="campo">
        <label for="titulo">Título da vaga</label>
        <input type="text" id="titulo" name="titulo" maxlength="100"
               placeholder="Ex.: Monitoria de Introdução à Programação">
      </div>

      <div class="campo">
        <label for="requisitos">Requisitos e critérios</label>
        <textarea id="requisitos" name="requisitos" rows="3" maxlength="500"
                  placeholder="Conhecimentos esperados, perfil, disponibilidade"></textarea>
      </div>

      <div class="campos">
        <div class="campo">
          <label for="cargaHoraria">Horas por semana</label>
          <input type="number" id="cargaHoraria" name="cargaHoraria" min="1" max="40" value="6">
        </div>
        <div class="campo">
          <label for="turno">Turno</label>
          <select id="turno" name="turno">
            <option>Manhã</option>
            <option>Tarde</option>
            <option>Noite</option>
          </select>
        </div>
        <div class="campo">
          <label for="modalidade">Modalidade</label>
          <select id="modalidade" name="modalidade">
            <option>Presencial</option>
            <option>Remoto</option>
            <option>Híbrido</option>
          </select>
        </div>
        <div class="campo">
          <label for="semestreMinimo">Semestre mínimo</label>
          <input type="number" id="semestreMinimo" name="semestreMinimo" min="1" max="20" value="1">
        </div>
        <div class="campo">
          <label for="vagasTotais">Posições</label>
          <input type="number" id="vagasTotais" name="vagasTotais" min="1" max="100" value="1">
        </div>
        <div class="campo">
          <label for="dataEncerramento">Inscrições até</label>
          <input type="date" id="dataEncerramento" name="dataEncerramento"
                 min="${hojeNoFormatoDoCampo()}">
        </div>
      </div>

      <button class="botao botao--primario" type="submit">Publicar vaga</button>
      <div class="retorno" id="retornoPublicacao"></div>
    </form>`;
}
