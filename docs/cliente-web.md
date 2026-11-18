# Cliente Web: estrutura das telas e candidaturas (dupla A · front)

Este documento é o ponto de contato da frente "A · front" com os outros fronts
e com o back da dupla A. Vale junto com a página 7 do diagrama de classes.

## 1. Como o front está organizado

O Cliente Web é **uma aplicação React só** (React 19 + Vite). O código fica em
`public/src/`; `npm run build:cliente` compila para `public/dist/`, que é a pasta
que o Express serve. `npm run dev` e `npm run dev:memoria` compilam antes de subir
o servidor.

```
public/
├── index.html                 # só o <div id="app"> e o script de entrada (src/main.jsx)
├── vite.config.mjs            # build em public/dist; dev server com /api apontando para :3000
└── src/
    ├── main.jsx               # monta a <Aplicacao> e importa os estilos
    ├── Aplicacao.jsx          # sessão, estrutura comum e a tela de cada endereço
    ├── rotas.js               # TABELA DE TELAS e menu lateral de cada papel
    ├── navegacao.js           # navegar('/caminho'), useEndereco(), acharRota()
    ├── contexto.js            # useAplicacao() e useDados() (ver seção 2)
    ├── servicos-api.js        # único lugar que conhece os endereços da API
    ├── formatos.js            # datas, normalizar, iniciais, listaEmPortugues
    ├── vagas.js               # turnos, modalidades e sugestões das telas de vaga
    ├── estilos/
    │   ├── estilo.css         # estilos de todas as telas
    │   └── projetos.css       # estilos das telas de projetos e vagas
    ├── componentes/
    │   ├── Estrutura.jsx      # menu lateral, cabeçalho, sino, mensagem rápida
    │   ├── Popup.jsx          # <Popup>: o popup dos protótipos
    │   ├── Avisos.jsx         # <Aviso>, <Carregando>, <ErroDaTela>
    │   ├── Icones.jsx         # ícones do menu
    │   ├── Notificacao.jsx    # item de notificação e para onde o clique leva
    │   ├── Candidatura.jsx    # etiqueta de status, cards, linha do tempo, barra de filtro
    │   ├── CardDeVaga.jsx     # card de vaga (C01)
    │   └── AbasDeProjetos.jsx # abas Projetos / Meus projetos / Feed
    ├── paginas/               # UM ARQUIVO POR TELA
    │   ├── Entrada.jsx
    │   ├── VagasAbertas.jsx, DetalhesDaVaga.jsx, OfertarVaga.jsx           # frente C
    │   ├── MinhasCandidaturas.jsx, MinhaCandidatura.jsx                    # C05, C07, C18
    │   ├── CandidaturasRecebidas.jsx, CandidaturaRecebida.jsx              # C15, C11
    │   ├── ListaDeProjetos.jsx, DetalhesDoProjeto.jsx, MeusProjetos.jsx,
    │   │   FeedDeAtividades.jsx                                            # dupla B
    │   ├── SolicitarIncorporacao.jsx, AvaliarIncorporacoes.jsx             # C17
    │   ├── Notificacoes.jsx
    │   └── EmConstrucao.jsx   # provisória, para as rotas ainda não encaixadas
    └── exemplo/
        └── candidaturas.js    # PROVISÓRIO: dados de exemplo (seção 4)
```

Até a Etapa 3 havia duas aplicações: a casca e as telas de candidatura em
JavaScript puro (`public/js/`) e as telas de projetos e vagas num app React à
parte (`public/projetos/`), aberto dentro de um iframe. Agora tudo é a mesma
aplicação: as telas de projetos e vagas abrem direto na área de conteúdo, usam o
mesmo popup, a mesma mensagem rápida e a mesma sessão, e o Voltar do navegador
funciona entre elas. Os endereços (`#/vagas`, `#/projetos/1`...) não mudaram.

Para trabalhar no front com recarga automática, suba o servidor
(`npm run dev:memoria`) e, em outro terminal, `npm run dev:cliente`; abra
`http://localhost:5173`.

## 2. Como encaixar uma tela (duplas B e C)

1. Crie `public/src/paginas/MinhaTela.jsx`:

   ```jsx
   import { api } from '../servicos-api';
   import { useDados } from '../contexto';
   import { Carregando, ErroDaTela } from '../componentes/Avisos';

   export function MinhaTela({ usuario, params, consulta, definirTitulo, recarregar }) {
     const { carregando, dados, erro } = useDados(() => api.algumaCoisa(params.id));
     if (carregando) return <Carregando />;
     if (erro) return <ErroDaTela erro={erro} />;
     return <section className="card">…</section>;
   }
   ```

   Cada visita a um endereço monta a tela do zero; uma resposta que chega depois
   de o usuário sair da tela é descartada. Se o servidor responder 401 (sessão
   expirada), a aplicação volta sozinha para a entrada.

2. Em `public/src/rotas.js`, aponte a rota para o arquivo e apague o `dono`:

   ```js
   { caminho: '/banlist', titulo: 'BanList', papeis: ['ADMIN'],
     pagina: tela(() => import('./paginas/BanList.jsx'), 'BanList') },
   ```

3. Acrescente as chamadas da sua frente em `servicos-api.js`, na seção dela.

O que já está pronto para usar:

| Precisa de | Use |
|---|---|
| Ir para outra tela | `navegar('/candidaturas/12')` de `navegacao.js`, ou um link `<a href="#/candidaturas/12">` |
| Popup (Denunciar, Reverter banimento…) | `<Popup aberto aoFechar titulo rotuloConfirmar perigo aoConfirmar>` de `componentes/Popup.jsx`. Se `aoConfirmar` lançar erro, a mensagem aparece dentro do popup, que continua aberto |
| Retorno depois de uma ação ("Vaga publicada.") | `mensagemRapida(texto)` de `useAplicacao()`; pode chamar antes de `navegar` ou `recarregar` |
| Notificações | Página completa em `#/notificacoes` e dropdown no sino; os dois usam `componentes/Notificacao.jsx`. Para atualizar o sino: `definirContadorDoSino(n)` de `useAplicacao()` |
| Trocar o título do cabeçalho | `definirTitulo('Robótica na Escola')` (prop da tela) |
| Desenhar a tela de novo depois de uma ação | `recarregar()` (prop da tela) |
| Quem está logado | `usuario` (prop da tela) ou `useAplicacao().usuario` |
| Item novo no menu lateral | `MENU` em `rotas.js`; ícone novo em `componentes/Icones.jsx` |

Endereços que as telas de candidatura já usam e que apontam para telas de
outras frentes (os de perfil ainda caem na tela provisória):

| Endereço | Quem abre | Dono |
|---|---|---|
| `#/vagas/:id` | botão "Ver vaga" de Minha candidatura | frente C (Detalhes da Vaga, C03) |
| `#/usuarios/:id` | botão "Ver perfil" da Candidatura do coordenador | frente C (C16) |
| `#/meus-projetos` | Minha candidatura, depois de confirmar o ingresso | dupla B |
| `#/perfil` | avatar do cabeçalho e rodapé do menu | frente C (C16) |

E os endereços das telas de candidatura, para os links das notificações (dupla B):

| Notificação | Link |
|---|---|
| Resultado da avaliação, para o estudante | `#/candidaturas/<id da candidatura>` |
| Nova candidatura, para o coordenador ("Ver candidatura") | `#/candidaturas/recebidas/<id da candidatura>` |
| Candidaturas de uma vaga, a partir da Página do Projeto | `#/candidaturas/recebidas?vagaId=<id da vaga>` |

O botão "Denunciar" (C13, frente C) entra em `paginas/CandidaturaRecebida.jsx`,
entre "Recusar" e "Aprovar"; o lugar está marcado com um comentário.

## 3. O que o front espera da API de candidaturas (back da dupla A)

Os endereços são os da página 7 do diagrama. O diagrama não fixa o JSON das
respostas; o front lê o formato abaixo, que continua o que o `listarMinhas` da
Etapa 2 já devolve (campos no primeiro nível). O formato aninhado dos tipos de
dados (`{ candidatura: {...}, vagaTitulo, ... }`) também é aceito: quem converte
é `lerCandidatura`, em `servicos-api.js`.

| Rota | Corpo enviado | Resposta que o front lê |
|---|---|---|
| `GET /api/candidaturas/minhas` | | lista de `{ id, status, mensagem, criadaEm, vagaId, vagaTitulo, projetoId, projetoNome, coordenadorNome }` |
| `GET /api/candidaturas/:id` | | o mesmo objeto, mais `motivoDeclinio` e `historico: [{ status, ocorridoEm, observacao }]` |
| `DELETE /api/candidaturas/:id` | | 204 |
| `POST /api/candidaturas/:id/confirmacao` | | qualquer 2xx (a resposta não é lida) |
| `POST /api/candidaturas/:id/declinio` | `{ "motivo": "texto" \| null }` | qualquer 2xx |
| `GET /api/candidaturas/recebidas?vagaId=1&status=EM_ANALISE&status=ACEITA` | | lista de `{ id, status, mensagem, criadaEm, vagaId, vagaTitulo, projetoNome, estudante: { id, nome, curso, semestre } }` |
| `GET /api/candidaturas/recebidas/:id` | | o mesmo objeto, mais `historico` (se vier, a tela mostra) |
| `POST /api/candidaturas/:id/avaliacao` | `{ "decisao": "ACEITAR" \| "RECUSAR" }` | qualquer 2xx |

Pontos para conferir com o back:

- **Notificações do C04, C07 e C11**: o `NotificadorInApp` da dupla B já está
  na main, mas o `CandidaturaService` ainda não publica os eventos. Até lá o
  sino do coordenador não sobe quando chega uma candidatura.
- **Status no banco**: o `01-schema.sql` ainda tem `CANCELADA` e não tem
  `DECLINADA`, `REMOVIDA`, `motivo_declinio` nem a tabela `historico_status`.
  O front já conhece os nomes novos e continua mostrando `CANCELADA`.

- **Campos novos em `/minhas`**: hoje ela devolve só `id, status, mensagem,
  criadaEm, vagaTitulo, projetoNome`. Sem `vagaId` o botão "Ver vaga" não
  aparece; sem `coordenadorNome` a linha do professor não aparece. A tela não
  quebra, só fica mais pobre.
- **`status` repetido na consulta**: um parâmetro por valor. Com um valor só o
  Express entrega texto, com vários entrega lista; o `lerLista` do diagrama
  precisa aceitar os dois.
- **Erros**: sempre `{ "erro": "mensagem" }` com 4xx, como o `tratadorDeErros`
  já faz. A mensagem aparece dentro do popup, que continua aberto.
- **Nomes dos status**: o front conhece `EM_ANALISE, ACEITA, RECUSADA,
  CONFIRMADA, DECLINADA, REMOVIDA` (diagrama) e ainda `CANCELADA` (banco da
  Etapa 2). Os textos de cada um estão em `ROTULO_STATUS`, em
  `componentes/candidatura.js`.
- **Removidas**: se `/minhas` devolver candidaturas `REMOVIDA`, elas aparecem
  na lista com essa etiqueta. Se o back preferir não devolver, o front não muda.

## 4. Dados de exemplo (provisório)

As rotas novas da tabela acima ainda não existem no servidor. Enquanto isso,
quando o servidor responde "rota inexistente" (404 que não é JSON), a chamada é
atendida por `exemplo/candidaturas.js`, e uma faixa amarela avisa no topo da
tela. Cada rota passa a valer de verdade, sem mexer no front, quando o servidor
começar a respondê-la.

- Os dados usam os usuários, as vagas e as participações do seed e ficam
  guardados na aba do navegador: trocar de usuário e recarregar mantém,
  fechar a aba zera.
- A candidatura 1 do seed (Ana na Monitoria de Algoritmos) já vem incluída,
  porque a notificação do seed para a Profa. Carla aponta para ela.
- Confirmar o ingresso é recusado quando o estudante já está na equipe do
  projeto, como o índice `uq_participacao_ativa` fará no banco. A equipe é
  lida de verdade em `GET /api/participacoes/minhas`.
- Confirmar aqui não cria participação no banco: o projeto não aparece em
  Meus projetos nem na lista de participantes.
- Não há exemplo com status Confirmada de propósito, porque as participações
  do seed não vieram de candidatura. Para ver esse status, siga o roteiro.
- As candidaturas reais (feitas pelo C04) entram junto: o estudante pode
  removê-las, o coordenador pode aprová-las, o estudante pode confirmar. Nada
  disso chega ao banco. Por isso a contagem de posições da vaga não muda e uma
  candidatura "removida" aqui continua impedindo nova candidatura à mesma vaga.
- A candidatura real de um estudante só aparece para o coordenador depois que
  o estudante abriu "Minhas candidaturas" ou se candidatou nesta aba.

Roteiro que já funciona: entrar como Diego Alves e candidatar-se à Monitoria de
Algoritmos; entrar como Profa. Carla Menezes, abrir Candidaturas recebidas e
aprovar; entrar como Diego e confirmar o ingresso. Diego Alves também já tem
uma candidatura aceita (Comunicação e Divulgação), para confirmar ou declinar
direto. Para mostrar a regra da equipe, Carla Dias (já monitora na Robótica)
se candidata à Monitoria de Algoritmos e, depois de aprovada, não consegue
confirmar.

**Para remover** quando o back estiver na main: apagar a pasta
`public/src/exemplo/`, o bloco "DADOS DE EXEMPLO" de `servicos-api.js` (e as
chamadas a `exemplo` e `ouExemplo`), e a faixa "Dados de exemplo" de
`componentes/Estrutura.jsx` (com `useExemploEmUso`, em `contexto.js`).

## 5. C17 — Incorporar projeto

Em **Meus projetos**, coordenadores podem solicitar a incorporação de um
projeto ativo ainda sem coordenador no sistema. O pedido pode incluir uma
mensagem e fica pendente até a decisão administrativa. Administradores acessam
**Solicitações de incorporação** pelo menu lateral; ao deferir, o sistema vincula
o projeto ao coordenador solicitante, e ao indeferir ele continua disponível.
Projetos não incorporados ficam fora da aba **Projetos**; os pedidos pendentes
do coordenador aparecem em **Meus projetos** com o status de aprovação.

- `GET /api/base-institucional/projetos?termo=` lista projetos disponíveis
  (somente coordenadores).
- `POST /api/incorporacoes` recebe `{ "projetoId": 4, "mensagem": "..." }`.
- `GET /api/incorporacoes/minhas` lista os pedidos pendentes do coordenador atual.
- `GET /api/incorporacoes/pendentes` lista a fila (somente administradores).
- `POST /api/incorporacoes/:id/avaliacao` recebe
  `{ "decisao": "DEFERIDO" | "INDEFERIDO" }`.

O esquema da tabela `pedido_incorporacao` está em `db/01-schema.sql`. Para
atualizar um banco já inicializado, recrie o banco de desenvolvimento com
`npm run db:reset`; o banco em memória carrega o esquema atualizado ao iniciar.

## 6. Diferenças em relação aos protótipos

- **Nomes do menu**: "Vagas abertas" no lugar de "Main Page" e "Projetos" no
  lugar de "Buscar", seguindo os nomes das telas na divisão do trabalho.
- **Menu do coordenador**: ganhou "Candidaturas recebidas" e "Ofertar nova
  vaga". No protótipo essas telas abrem a partir das Notificações e da Página
  do Projeto, que ainda não existem. Quando existirem, basta tirar as duas
  linhas de `MENU.COORDENADOR`.
- **Sair** fica no rodapé do menu, abaixo de Perfil (o protótipo não tem).
- **Botões de Minha candidatura**: só aparecem os que valem para o status
  atual, com uma frase dizendo a situação. O protótipo desenha os três juntos.
- **Popup de declinar**: o botão repete o nome da ação ("Declinar ingresso")
  em vez de "Confirmar recusa", e o texto fala em "outro candidato" porque a
  lista de espera está no nível 3.
- **Confirmar ingresso e aprovar/recusar** também pedem confirmação em popup.
