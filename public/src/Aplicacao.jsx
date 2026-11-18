// A aplicacao: descobre quem esta logado, monta a estrutura comum e entrega
// cada endereco a tela dele. O conteudo das telas fica em `paginas/`, um
// arquivo por tela, e a tabela de enderecos em `rotas.js`.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, SESSAO_EXPIRADA } from './servicos-api';
import { MENU, ROTAS, ROTA_INICIAL } from './rotas';
import { acharRota, limparEndereco, navegar, recarregarTela, useEndereco } from './navegacao';
import { ContextoDaAplicacao } from './contexto';
import { Estrutura } from './componentes/Estrutura';
import { Aviso, Carregando } from './componentes/Avisos';
import { Entrada } from './paginas/Entrada';

export function Aplicacao() {
  // undefined: ainda perguntando ao servidor; null: ninguem logado.
  const [usuario, setUsuario] = useState(undefined);
  const endereco = useEndereco();

  // Recupera a sessao que o servidor ainda guarda (quando a pagina e recarregada).
  useEffect(() => {
    api.sessaoAtual().then(setUsuario, () => setUsuario(null));
  }, []);

  // A sessao expirou no servidor (ele foi reiniciado, por exemplo): volta para a entrada.
  useEffect(() => {
    const esquecer = () => setUsuario(null);
    window.addEventListener(SESSAO_EXPIRADA, esquecer);
    return () => window.removeEventListener(SESSAO_EXPIRADA, esquecer);
  }, []);

  // Logado no endereco raiz: vai para a tela inicial.
  useEffect(() => {
    if (usuario && endereco.caminho === '/') navegar(ROTA_INICIAL);
  }, [usuario, endereco.caminho]);

  if (usuario === undefined) return null;

  if (!usuario) {
    document.title = 'Connext — Extensão INF';
    return <Entrada aoEntrar={setUsuario} />;
  }

  if (endereco.caminho === '/') return null;

  return (
    <AreaLogada
      key={usuario.id}
      usuario={usuario}
      endereco={endereco}
      aoSair={async () => {
        await api.sair().catch(() => {});
        limparEndereco();
        setUsuario(null);
      }}
    />
  );
}

/** Estrutura comum + a tela do endereco atual. */
function AreaLogada({ usuario, endereco, aoSair }) {
  const { caminho, consulta, versao } = endereco;
  const achada = useMemo(() => acharRota(caminho, ROTAS), [caminho]);

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [naoLidas, setNaoLidas] = useState(0);

  // Qual "visita" de tela esta na pagina. Uma tela lenta que termina de
  // carregar depois de o usuario ja ter ido para outra nao muda o titulo.
  const visitaAtual = useRef(versao);
  visitaAtual.current = versao;

  // A cada troca de tela: titulo da rota, mensagem rapida e contador do sino.
  useEffect(() => {
    setTitulo(achada ? achada.rota.titulo : 'Tela não encontrada');

    // A mensagem rapida some na troca de tela, a nao ser que tenha sido
    // criada justamente para aparecer na tela seguinte ("Candidatura removida.").
    setMensagem((atual) => (atual?.atravessaUmaTela ? { ...atual, atravessaUmaTela: false } : null));

    // Falha aqui nao atrapalha a tela: o sino so fica como estava.
    api.notificacoesNaoLidas().then(setNaoLidas, () => {});
  }, [versao, achada]);

  useEffect(() => {
    if (titulo) document.title = `${titulo} — Connext`;
  }, [titulo]);

  const mensagemRapida = useCallback((texto, tipo = 'sucesso') => {
    setMensagem({ texto, tipo, atravessaUmaTela: true });
  }, []);

  const contexto = useMemo(
    () => ({ usuario, mensagemRapida, definirContadorDoSino: setNaoLidas }),
    [usuario, mensagemRapida]
  );

  const definirTitulo = useCallback(
    (novo) => {
      // So vale enquanto esta tela ainda e a que esta na pagina.
      if (visitaAtual.current === versao) setTitulo(novo);
    },
    [versao]
  );

  let tela;
  if (!achada) {
    tela = <Aviso tipo="info">Este endereço não leva a nenhuma tela. Use o menu ao lado.</Aviso>;
  } else if (achada.rota.papeis && !achada.rota.papeis.includes(usuario.papel)) {
    tela = <Aviso tipo="info">Esta tela não está disponível para o seu perfil.</Aviso>;
  } else {
    const Pagina = achada.rota.pagina;
    tela = (
      <Suspense fallback={<Carregando />}>
        {/* key: cada visita monta a tela do zero, como uma pagina nova. */}
        <Pagina
          key={versao}
          usuario={usuario}
          params={achada.params}
          consulta={consulta}
          rota={achada.rota}
          definirTitulo={definirTitulo}
          recarregar={recarregarTela}
        />
      </Suspense>
    );
  }

  return (
    <ContextoDaAplicacao.Provider value={contexto}>
      <Estrutura
        usuario={usuario}
        itens={MENU[usuario.papel] ?? []}
        itemDoMenu={achada ? achada.rota.menu ?? achada.rota.caminho : null}
        titulo={titulo}
        mensagem={mensagem}
        naoLidas={naoLidas}
        aoMudarNaoLidas={setNaoLidas}
        aoSair={aoSair}
        versao={versao}
      >
        {tela}
      </Estrutura>
    </ContextoDaAplicacao.Provider>
  );
}
