// Tela provisoria das rotas que ainda nao foram encaixadas. Existe para o
// menu ja estar completo e os links entre telas terem para onde apontar.
// Quando a tela de verdade ficar pronta, e so trocar `pagina` em rotas.js.

export function EmConstrucao({ rota }) {
  return (
    <section className="vazio">
      <h2>Esta tela ainda não foi encaixada</h2>
      <p>
        “{rota.titulo}” está com a {rota.dono ?? 'equipe'}.
        Para encaixar, crie o componente da tela em <code>public/src/paginas/</code>
        {' '}e aponte a rota <code>{rota.caminho}</code> para ele em{' '}
        <code>public/src/rotas.js</code>.
      </p>
    </section>
  );
}
