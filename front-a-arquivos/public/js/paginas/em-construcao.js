// Tela provisoria das rotas que ainda nao foram encaixadas. Existe para o
// menu ja estar completo e os links entre telas terem para onde apontar.
// Quando a tela de verdade ficar pronta, e so trocar `pagina` em rotas.js.

import { escapar } from '../componentes/base.js';

export async function mostrar(conteudo, { rota }) {
  conteudo.innerHTML = `
    <section class="vazio">
      <h2>Esta tela ainda não foi encaixada</h2>
      <p>
        “${escapar(rota.titulo)}” está com a ${escapar(rota.dono ?? 'equipe')}.
        Para encaixar, crie o arquivo da tela em <code>public/js/paginas/</code>
        e aponte a rota <code>${escapar(rota.caminho)}</code> para ele em
        <code>public/js/rotas.js</code>.
      </p>
    </section>`;
}
