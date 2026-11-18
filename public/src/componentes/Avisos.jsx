// Mensagens simples usadas por todas as telas.

export function Aviso({ tipo = 'info', children, ...resto }) {
  return <p className={`aviso aviso--${tipo}`} {...resto}>{children}</p>;
}

export function Carregando({ children = 'Carregando…' }) {
  return <p className="carregando">{children}</p>;
}

/** O erro de uma tela que nao conseguiu carregar. */
export function ErroDaTela({ erro }) {
  return <Aviso tipo="erro">{erro?.message || 'Não foi possível abrir esta tela.'}</Aviso>;
}
