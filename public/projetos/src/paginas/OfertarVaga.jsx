import { useEffect, useState } from 'react';
import { api } from '../servicos-api';
import {
  AREAS_SUGERIDAS, BENEFICIOS, CURSOS_SUGERIDOS, MODALIDADES, TURNOS, irPara, tratarSessaoExpirada
} from '../vagas';

/** Hoje no formato do campo de data ("AAAA-MM-DD"), pelo relogio do navegador. */
function hoje() {
  const d = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** Campo de lista: digita, Enter (ou "Adicionar") acrescenta; o X tira. */
function ListaDeTextos({ id, rotulo, itens, aoMudar, sugestoes, dica }) {
  const [texto, setTexto] = useState('');

  function adicionar() {
    const novo = texto.trim();
    if (novo && !itens.some((item) => item.toLowerCase() === novo.toLowerCase()) && itens.length < 10) {
      aoMudar([...itens, novo]);
    }
    setTexto('');
  }

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="lista-de-textos">
        {itens.map((item) => (
          <span className="etiqueta etiqueta--aceita" key={item}>
            {item}
            <button type="button" className="lista-de-textos__tirar" aria-label={`Tirar ${item}`}
                    onClick={() => aoMudar(itens.filter((i) => i !== item))}>×</button>
          </span>
        ))}
      </div>
      <div className="lista-de-textos__entrada">
        <input
          id={id}
          type="text"
          list={`${id}-sugestoes`}
          value={texto}
          maxLength={60}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              adicionar();
            }
          }}
          placeholder={dica}
        />
        <button type="button" className="botao" onClick={adicionar}>+ Adicionar</button>
      </div>
      <datalist id={`${id}-sugestoes`}>
        {sugestoes.map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

/** C06 - Publicar Vaga de Projeto ("Ofertar nova vaga" no prototipo). */
export function OfertarVaga({ usuario, projetoInicial }) {
  const [projetos, setProjetos] = useState(null);
  const [erroAoCarregar, setErroAoCarregar] = useState('');
  const [dados, setDados] = useState({
    projetoId: projetoInicial ? String(projetoInicial) : '',
    titulo: '',
    descricao: '',
    vagasTotais: '1',
    cargaHoraria: '',
    dataEncerramento: '',
    turno: TURNOS[0],
    modalidade: MODALIDADES[0],
    areasTematicas: [],
    cursosAceitos: [],
    semestreMinimo: '1',
    requisitos: '',
    beneficio: BENEFICIOS[0],
    duracaoEmMeses: ''
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (usuario?.papel !== 'COORDENADOR') return;
    api.projetosParaPublicar()
      .then((lista) => {
        setProjetos(lista);
        if (lista.length === 1) setDados((atual) => ({ ...atual, projetoId: atual.projetoId || String(lista[0].id) }));
      })
      .catch((falha) => {
        if (!tratarSessaoExpirada(falha)) setErroAoCarregar(falha.message);
      });
  }, [usuario?.papel]);

  function atualizar(chave, valor) {
    setDados((atual) => ({ ...atual, [chave]: valor }));
  }

  async function publicar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      // Quem valida e o servidor; a mensagem dele aparece aqui embaixo.
      const vaga = await api.publicarVaga({
        projetoId: Number(dados.projetoId),
        titulo: dados.titulo,
        descricao: dados.descricao,
        requisitos: dados.requisitos,
        cargaHoraria: Number(dados.cargaHoraria),
        turno: dados.turno,
        modalidade: dados.modalidade,
        semestreMinimo: Number(dados.semestreMinimo),
        vagasTotais: Number(dados.vagasTotais),
        dataEncerramento: dados.dataEncerramento,
        areasTematicas: dados.areasTematicas,
        cursosAceitos: dados.cursosAceitos,
        beneficio: dados.beneficio,
        duracaoEmMeses: dados.duracaoEmMeses ? Number(dados.duracaoEmMeses) : null
      });
      // Pos-condicao do C06: a vaga ja esta publicada e aberta. Mostra o detalhe dela.
      irPara(`/vagas/${vaga.id}`);
    } catch (falha) {
      if (!tratarSessaoExpirada(falha)) setErro(falha.message);
      setEnviando(false);
    }
  }

  if (usuario && usuario.papel !== 'COORDENADOR') {
    return <p className="aviso aviso--info">Só coordenadores ofertam vagas.</p>;
  }
  if (erroAoCarregar) return <p className="aviso aviso--erro">{erroAoCarregar}</p>;
  if (!projetos) return <p className="carregando">Carregando seus projetos…</p>;

  // Pre-condicao do C06: projeto cadastrado e ativo, coordenado por quem publica.
  if (projetos.length === 0) {
    return (
      <section className="vazio">
        <h2>Nenhum projeto disponível</h2>
        <p>
          Para ofertar uma vaga, você precisa coordenar um projeto ativo. Se o seu projeto já está na
          base da Comissão de Extensão, peça a incorporação em Meus projetos.
        </p>
        <button type="button" className="botao botao--primario" onClick={() => irPara('/meus-projetos')}>
          Ir para Meus projetos
        </button>
      </section>
    );
  }

  return (
    <form className="card formulario ofertar-vaga" onSubmit={publicar} noValidate>
      <div>
        <h2>Ofertar nova vaga</h2>
        <p className="formulario__nota">
          A vaga aparece em Vagas abertas assim que for publicada e aceita candidaturas até a data de
          encerramento.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="projeto">Projeto</label>
        <select id="projeto" value={dados.projetoId} onChange={(e) => atualizar('projetoId', e.target.value)}>
          <option value="">Escolha o projeto…</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.area}</option>)}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="titulo">Título da vaga</label>
        <input id="titulo" type="text" maxLength={100} value={dados.titulo}
               onChange={(e) => atualizar('titulo', e.target.value)} />
      </div>

      <div className="campo">
        <label htmlFor="descricao">Descrição da vaga e filosofia de trabalho</label>
        <textarea id="descricao" rows="5" maxLength={2000} value={dados.descricao}
                  onChange={(e) => atualizar('descricao', e.target.value)} />
      </div>

      <div className="campos">
        <div className="campo">
          <label htmlFor="vagasTotais">Nº de vagas</label>
          <input id="vagasTotais" type="number" min="1" max="100" value={dados.vagasTotais}
                 onChange={(e) => atualizar('vagasTotais', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="cargaHoraria">Carga horária semanal</label>
          <input id="cargaHoraria" type="number" min="1" max="40" value={dados.cargaHoraria}
                 onChange={(e) => atualizar('cargaHoraria', e.target.value)} placeholder="horas" />
        </div>
        <div className="campo">
          <label htmlFor="dataEncerramento">Inscrições até</label>
          <input id="dataEncerramento" type="date" min={hoje()} value={dados.dataEncerramento}
                 onChange={(e) => atualizar('dataEncerramento', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="turno">Turno</label>
          <select id="turno" value={dados.turno} onChange={(e) => atualizar('turno', e.target.value)}>
            {TURNOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="duracao">Duração (meses)</label>
          <input id="duracao" type="number" min="1" max="24" value={dados.duracaoEmMeses}
                 onChange={(e) => atualizar('duracaoEmMeses', e.target.value)} placeholder="sem prazo" />
        </div>
      </div>

      <fieldset className="ofertar-vaga__opcoes">
        <legend>Modo de operação</legend>
        {MODALIDADES.map((m) => (
          <label key={m}>
            <input type="radio" name="modalidade" value={m} checked={dados.modalidade === m}
                   onChange={() => atualizar('modalidade', m)} /> {m}
          </label>
        ))}
      </fieldset>

      <ListaDeTextos id="areas" rotulo="Áreas temáticas" itens={dados.areasTematicas}
                     aoMudar={(v) => atualizar('areasTematicas', v)} sugestoes={AREAS_SUGERIDAS}
                     dica="Sem nenhuma, vale a área do projeto" />

      <h3 className="ofertar-vaga__secao">Pré-requisitos</h3>
      <div className="campos">
        <div className="campo">
          <label htmlFor="semestreMinimo">Semestre mínimo</label>
          <input id="semestreMinimo" type="number" min="1" max="20" value={dados.semestreMinimo}
                 onChange={(e) => atualizar('semestreMinimo', e.target.value)} />
        </div>
      </div>
      <ListaDeTextos id="cursos" rotulo="Curso(s)" itens={dados.cursosAceitos}
                     aoMudar={(v) => atualizar('cursosAceitos', v)} sugestoes={CURSOS_SUGERIDOS}
                     dica="Sem nenhum, aceita todos os cursos" />
      <div className="campo">
        <label htmlFor="requisitos">Outros requisitos</label>
        <textarea id="requisitos" rows="3" maxLength={500} value={dados.requisitos}
                  onChange={(e) => atualizar('requisitos', e.target.value)}
                  placeholder="Conhecimentos, disponibilidade, perfil…" />
      </div>

      <fieldset className="ofertar-vaga__opcoes">
        <legend>Benefício</legend>
        {BENEFICIOS.map((b) => (
          <label key={b}>
            <input type="radio" name="beneficio" value={b} checked={dados.beneficio === b}
                   onChange={() => atualizar('beneficio', b)} /> {b}
          </label>
        ))}
      </fieldset>

      {erro && <p className="aviso aviso--erro" role="alert">{erro}</p>}

      <div className="detalhe-vaga__acoes">
        <button type="button" className="botao" disabled={enviando} onClick={() => irPara('/vagas')}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? 'Publicando…' : 'Publicar vaga'}
        </button>
      </div>
    </form>
  );
}
