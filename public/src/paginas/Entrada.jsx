// Tela de entrada. E a unica fora da estrutura comum (sem menu nem cabecalho).

import { useState } from 'react';
import { api } from '../servicos-api';
import { useDados } from '../contexto';
import { Aviso, Carregando } from '../componentes/Avisos';

/**
 * SIMPLIFICACAO DECLARADA: o usuario e escolhido numa lista, sem senha.
 * Login com senha e bloqueio esta no nivel 3 da divisao do trabalho.
 */
export function Entrada({ aoEntrar }) {
  const { carregando, dados: usuarios, erro } = useDados(() => api.listarUsuarios());

  return (
    <main className="pagina-de-entrada">
      <h1 className="titulo">Connext</h1>
      <p className="subtitulo">Conexão entre projetos de extensão e alunos do INF</p>
      <section className="entrada" id="entrada">
        {carregando ? (
          <Carregando />
        ) : erro ? (
          <Aviso tipo="erro">{erro.message}</Aviso>
        ) : (
          <Formulario usuarios={usuarios} aoEntrar={aoEntrar} />
        )}
      </section>
    </main>
  );
}

function Formulario({ usuarios, aoEntrar }) {
  const estudantes = usuarios.filter((u) => u.papel === 'ESTUDANTE');
  const demais = usuarios.filter((u) => u.papel !== 'ESTUDANTE');
  const [escolhido, setEscolhido] = useState(String(estudantes[0]?.id ?? demais[0]?.id ?? ''));
  const [erro, setErro] = useState('');

  async function entrar() {
    setErro('');
    try {
      aoEntrar(await api.entrar(Number(escolhido)));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <>
      <h2>Entrar no sistema</h2>
      <p className="entrada__nota">
        Login simplificado para a demonstração: escolha quem você é.
      </p>
      <label htmlFor="usuario">Usuário</label>
      <select id="usuario" value={escolhido} onChange={(evento) => setEscolhido(evento.target.value)}>
        <optgroup label="Estudantes">
          {estudantes.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome} — {u.semestre}º sem., {u.curso}
            </option>
          ))}
        </optgroup>
        <optgroup label="Outros papéis">
          {demais.map((u) => (
            <option key={u.id} value={u.id}>{u.nome} — {u.papel}</option>
          ))}
        </optgroup>
      </select>
      <button type="button" className="botao botao--primario" id="btEntrar" onClick={entrar}>
        Entrar
      </button>
      <p className="retorno" id="retornoEntrada">{erro && <Aviso tipo="erro">{erro}</Aviso>}</p>
    </>
  );
}
