import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import { useAplicacao, useDados } from '../contexto';
import { Aviso, Carregando, ErroDaTela } from '../componentes/Avisos';
import { diaBr, iniciais } from '../formatos';
import { CURSOS_SUGERIDOS } from '../vagas';

const ROTULO_PAPEL = {
  ESTUDANTE: 'Estudante',
  COORDENADOR: 'Coordenação',
  ADMIN: 'Administração'
};

/** Os links do perfil, na ordem do prototipo. */
const LINKS = [
  { campo: 'lattes', rotulo: 'CV Lattes' },
  { campo: 'linkedin', rotulo: 'LinkedIn' },
  { campo: 'github', rotulo: 'GitHub' },
  { campo: 'paginaPessoal', rotulo: 'Página pessoal' }
];

/** Os mesmos limites do servidor (UsuarioController). */
const LIMITES = { descricao: 1000, contato: 200, link: 300, curso: 100 };

/** So vira link o que e http(s): o servidor ja confere, aqui e a segunda barreira. */
function enderecoSeguro(valor) {
  return typeof valor === 'string' && /^https?:\/\//i.test(valor) ? valor : null;
}

/**
 * C16 - Perfil. Em #/perfil, o proprio (com Configuracoes); em
 * #/usuarios/:id, o de outra pessoa, so para leitura.
 */
export function Perfil({ usuario, params, definirTitulo }) {
  const usuarioId = params.id ?? usuario.id;
  const { carregando, dados, erro } = useDados(() => api.perfil(usuarioId), [usuarioId]);
  // Depois de salvar, a tela mostra o perfil que o servidor devolveu.
  const [salvo, setSalvo] = useState(null);
  const perfil = salvo ?? dados;

  useEffect(() => {
    if (perfil && !perfil.ehProprio) definirTitulo(`Perfil de ${perfil.nome}`);
  }, [perfil, definirTitulo]);

  if (carregando) return <Carregando>Carregando o perfil…</Carregando>;
  if (erro) return <ErroDaTela erro={erro} />;

  return (
    <div className="perfil">
      <Cabecalho perfil={perfil} />
      <Projetos perfil={perfil} />
      {perfil.papel === 'ESTUDANTE' && <Avaliacoes />}
      {perfil.ehProprio && <Configuracoes perfil={perfil} aoSalvar={setSalvo} />}
    </div>
  );
}

/** Nome, descricao, links e contato, como no prototipo. */
function Cabecalho({ perfil }) {
  const links = LINKS.map((link) => ({ ...link, href: enderecoSeguro(perfil[link.campo]) }))
    .filter((link) => link.href);
  const sobre = [ROTULO_PAPEL[perfil.papel] ?? perfil.papel];
  if (perfil.curso) sobre.push(perfil.curso);
  if (perfil.semestre) sobre.push(`${perfil.semestre}º semestre`);

  return (
    <section className="card perfil__cabeca">
      <div className="perfil__identidade">
        <h2>{perfil.nome}</h2>
        <p className="perfil__sobre">{sobre.join(' · ')}</p>

        {perfil.descricao ? (
          <p className="perfil__descricao texto-longo">{perfil.descricao}</p>
        ) : (
          <p className="perfil__descricao perfil__descricao--vazia">
            {perfil.ehProprio
              ? 'Você ainda não escreveu uma descrição. Use Configurações, abaixo.'
              : 'Esta pessoa ainda não escreveu uma descrição.'}
          </p>
        )}

        {links.length > 0 && (
          <div className="perfil__links">
            {links.map((link) => (
              <a className="chip" key={link.campo} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.rotulo}
              </a>
            ))}
          </div>
        )}

        <div className="perfil__contato">
          <h3>Informações de contato</h3>
          {perfil.email && (
            <p><a className="link" href={`mailto:${perfil.email}`}>{perfil.email}</a></p>
          )}
          {perfil.contato && <p className="texto-longo">{perfil.contato}</p>}
          {!perfil.email && !perfil.contato && (
            <p className="discreto">Nenhuma informação de contato pública.</p>
          )}
        </div>
      </div>

      <span className="perfil__foto" aria-hidden="true">{iniciais(perfil.nome)}</span>
    </section>
  );
}

function Projetos({ perfil }) {
  const ativos = perfil.projetos.filter((p) => p.ativa);
  const anteriores = perfil.projetos.filter((p) => !p.ativa);

  return (
    <section className="perfil__secao">
      <h2>Projetos</h2>
      {perfil.projetos.length === 0 ? (
        <Aviso>Ainda não participa de nenhum projeto.</Aviso>
      ) : (
        <ul className="perfil__projetos">
          {[...ativos, ...anteriores].map((projeto) => (
            <li key={`${projeto.projetoId}-${projeto.inicio ?? 'coord'}`} className="card perfil__projeto">
              <div>
                <a className="feed__titulo" href={`#/projetos/${projeto.projetoId}`}>
                  <strong>{projeto.projetoNome}</strong>
                </a>
                <p className="discreto">
                  {projeto.cargo}
                  {projeto.inicio ? ` · desde ${diaBr(projeto.inicio)}` : ''}
                  {projeto.fim ? ` até ${diaBr(projeto.fim)}` : ''}
                </p>
              </div>
              <span className={`etiqueta ${projeto.ativa ? 'etiqueta--confirmada' : 'etiqueta--cancelada'}`}>
                {projeto.ativa ? (projeto.coordenador ? 'Coordena' : 'Na equipe') : 'Encerrada'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** As avaliacoes sao o C08 (nivel 3), que nao foi implementado. */
function Avaliacoes() {
  return (
    <section className="perfil__secao">
      <h2>Avaliações do estudante em projetos anteriores</h2>
      <Aviso>As avaliações feitas pelos coordenadores ainda não estão disponíveis no sistema.</Aviso>
    </section>
  );
}

/** Configuracoes: o formulario do proprio perfil (PUT /api/perfil). */
function Configuracoes({ perfil, aoSalvar }) {
  const { mensagemRapida, atualizarUsuario } = useAplicacao();
  const ehEstudante = perfil.papel === 'ESTUDANTE';
  const [campos, setCampos] = useState(() => ({
    descricao: perfil.descricao ?? '',
    contato: perfil.contato ?? '',
    lattes: perfil.lattes ?? '',
    linkedin: perfil.linkedin ?? '',
    github: perfil.github ?? '',
    paginaPessoal: perfil.paginaPessoal ?? '',
    curso: perfil.curso ?? '',
    semestre: perfil.semestre ?? ''
  }));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const mudar = (campo) => (evento) => setCampos((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function salvar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const dados = { ...campos };
      if (!ehEstudante) {
        dados.curso = null;
        dados.semestre = null;
      }
      const atualizado = await api.atualizarPerfil(dados);
      aoSalvar(atualizado);
      // O cabecalho mostra o semestre de quem esta logado: atualiza tambem.
      atualizarUsuario?.({
        id: atualizado.id,
        nome: atualizado.nome,
        papel: atualizado.papel,
        curso: atualizado.curso,
        semestre: atualizado.semestre
      });
      mensagemRapida('Perfil atualizado.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="perfil__secao">
      <h2>Configurações</h2>
      <form className="card formulario perfil-config" onSubmit={salvar}>
        <div className="campo">
          <label htmlFor="perfil-descricao">Descrição</label>
          <textarea id="perfil-descricao" rows={4} maxLength={LIMITES.descricao}
                    value={campos.descricao} onChange={mudar('descricao')}
                    placeholder="Conte um pouco sobre você, seus interesses e experiências." />
          <small className="discreto">{campos.descricao.length} de {LIMITES.descricao} caracteres</small>
        </div>

        <div className="campo">
          <label htmlFor="perfil-contato">Informações de contato</label>
          <input id="perfil-contato" type="text" maxLength={LIMITES.contato}
                 value={campos.contato} onChange={mudar('contato')}
                 placeholder="Ex.: Discord, telefone da sala, horário de atendimento" />
          <small className="discreto">
            {ehEstudante
              ? 'Aparece para todos. O seu e-mail só aparece para você, para coordenadores e para a administração.'
              : 'Aparece para todos, junto com o seu e-mail institucional.'}
          </small>
        </div>

        <div className="perfil-config__links">
          {LINKS.map((link) => (
            <div className="campo" key={link.campo}>
              <label htmlFor={`perfil-${link.campo}`}>{link.rotulo}</label>
              <input id={`perfil-${link.campo}`} type="url" maxLength={LIMITES.link}
                     value={campos[link.campo]} onChange={mudar(link.campo)} placeholder="https://" />
            </div>
          ))}
        </div>

        {ehEstudante && (
          <div className="perfil-config__curso">
            <div className="campo">
              <label htmlFor="perfil-curso">Curso</label>
              <input id="perfil-curso" type="text" list="perfil-cursos" required maxLength={LIMITES.curso}
                     value={campos.curso} onChange={mudar('curso')} />
              <datalist id="perfil-cursos">
                {CURSOS_SUGERIDOS.map((curso) => <option key={curso} value={curso} />)}
              </datalist>
            </div>
            <div className="campo">
              <label htmlFor="perfil-semestre">Semestre</label>
              <input id="perfil-semestre" type="number" min={1} max={20} required
                     value={campos.semestre} onChange={mudar('semestre')} />
            </div>
            <small className="discreto perfil-config__nota">
              As vagas usam o curso e o semestre para decidir quem pode se candidatar.
            </small>
          </div>
        )}

        {erro && <Aviso tipo="erro" role="alert">{erro}</Aviso>}
        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar perfil'}
        </button>
      </form>
    </section>
  );
}
