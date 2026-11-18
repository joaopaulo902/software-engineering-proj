// Abas que ligam as tres listas de projetos: Projetos, Meus projetos e o
// Feed de atividades. Cada aba e uma tela com endereco proprio.

import { navegar } from '../navegacao';
import { useAplicacao } from '../contexto';

const ABAS = [
  { caminho: '/projetos', rotulo: 'Projetos' },
  // Meus projetos so existe para quem participa ou coordena (ver rotas.js).
  { caminho: '/meus-projetos', rotulo: 'Meus Projetos', papeis: ['ESTUDANTE', 'COORDENADOR'] },
  { caminho: '/atividades', rotulo: 'Feed de Atividades' }
];

export function AbasDeProjetos({ atual }) {
  const { usuario } = useAplicacao();

  return (
    <nav className="abas" aria-label="Seções">
      {ABAS.filter((aba) => !aba.papeis || aba.papeis.includes(usuario?.papel)).map((aba) => (
        <button
          key={aba.caminho}
          type="button"
          className={`aba ${atual === aba.caminho ? 'aba--ativa' : ''}`}
          aria-current={atual === aba.caminho ? 'page' : undefined}
          onClick={() => navegar(aba.caminho)}
        >
          {aba.rotulo}
        </button>
      ))}
    </nav>
  );
}
