# Cliente Web: estrutura das telas e candidaturas (dupla A · front)

Este documento é o ponto de contato da frente "A · front" com os outros fronts
e com o back da dupla A. Vale junto com a página 7 do diagrama de classes.

## 1. Como o front está organizado

```
public/
├── index.html                 # só o <div id="app"> e o script de entrada
├── estilo.css                 # estilos de todas as telas
├── projetos/                  # aplicação React para projetos, equipe e atividades
│   ├── index.html
│   └── src/
│       ├── Aplicacao.jsx
│       ├── servicos-api.js
│       ├── componentes/
│       │   ├── Modal.jsx
│       │   └── Notificacoes.jsx
│       └── paginas/
│           ├── ListaDeProjetos.jsx
│           ├── DetalhesDoProjeto.jsx
│           ├── MeusProjetos.jsx
│           └── FeedDeAtividades.jsx
└── js/
    ├── principal.js           # entrada: sessão, estrutura comum, entrega o endereço à tela
    ├── rotas.js               # TABELA DE TELAS e menu lateral de cada papel
    ├── navegacao.js           # navegar('/caminho'), leitura do endereço depois do "#"
    ├── sessao.js              # usuarioAtual(), entrar(), sair()
    ├── servicos-api.js        # único lugar que conhece os endereços da API
    ├── componentes/
    │   ├── base.js            # escapar, datas, aviso, carregando
    │   ├── estrutura.js       # menu lateral, cabeçalho, sino, mensagem rápida
    │   ├── popup.js           # abrirPopup(...): o popup dos protótipos
    │   ├── candidatura.js     # etiqueta de status, cards, linha do tempo, barra de filtro
    │   └── vaga.js            # card e formulário de vaga (vieram do componentes.js)
    ├── paginas/               # UM ARQUIVO POR TELA
    │   ├── entrada.js
    │   ├── vagas-abertas.js           # C01 + botão do C04 (veio do paginas.js)
    │   ├── publicar-vaga.js           # C06 (veio do paginas.js)
    │   ├── minhas-candidaturas.js     # C05
    │   ├── minha-candidatura.js       # C05, C07, C18
    │   ├── candidaturas-recebidas.js  # C15
    │   ├── candidatura-recebida.js    # C15, C11
    │   └── em-construcao.js           # provisória, para as rotas ainda não encaixadas
    └── exemplo/
        └── candidaturas.js    # PROVISÓRIO: dados de exemplo (seção 4)
```

As telas de projetos são mantidas nessa aplicação React, separadas por função
em `projetos/src/paginas/`. `js/paginas/aplicacao-projetos.js` liga as rotas do
app principal à aplicação compilada em `public/projetos/dist/`. Execute
`npm run build` para gerar os arquivos servidos pelo Express.

O `paginas.js` e o `componentes.js` antigos não existem mais. As telas que já
funcionavam (entrada, vagas abertas, publicar vaga) foram só movidas.

## 2. Como encaixar uma tela (duplas B e C)

1. Crie `public/js/paginas/minha-tela.js`:

   ```js
   import { api } from '../servicos-api.js';

   export async function mostrar(conteudo, contexto) {
     // conteudo: o elemento onde a tela desenha
     // contexto: { usuario, params, consulta, definirTitulo, recarregar }
     const dados = await api.algumaCoisa(contexto.params.id);
     conteudo.innerHTML = `...`;
   }
   ```

   Se `mostrar` lançar um erro (a API respondeu 404, por exemplo), a estrutura
   mostra a mensagem no lugar da tela. Não precisa de `try/catch` para isso.

2. Em `public/js/rotas.js`, aponte a rota para o arquivo e apague o `dono`:

   ```js
   { caminho: '/projetos/:id', titulo: 'Página do projeto', papeis: TODOS, menu: '/projetos',
     pagina: () => import('./paginas/pagina-do-projeto.js') },
   ```

3. Acrescente as chamadas da sua frente em `servicos-api.js`, na seção dela.

O que já está pronto para usar:

| Precisa de | Use |
|---|---|
| Ir para outra tela | `navegar('/candidaturas/12')` de `navegacao.js`, ou um link `<a href="#/candidaturas/12">` |
| Popup (Detalhes da Vaga, Ofertar nova vaga, Denunciar, Reverter banimento…) | `abrirPopup({ titulo, corpo, rotuloConfirmar, perigo, aoConfirmar })` de `componentes/popup.js` |
| Retorno depois de uma ação ("Vaga publicada.") | `mensagemRapida(texto)` de `componentes/estrutura.js`; pode chamar antes de `navegar` ou `recarregar` |
| Notificações | `projetos/src/componentes/Notificacoes.jsx` carrega e marca notificações como lidas |
| Trocar o título do cabeçalho | `contexto.definirTitulo('Robótica na Escola')` |
| Redesenhar a tela depois de uma ação | `contexto.recarregar()` |
| Item novo no menu lateral | `MENU` em `rotas.js`; ícone novo em `ICONES` de `componentes/estrutura.js` |

Endereços que as telas de candidatura já usam e que apontam para telas de
outras frentes (hoje caem na tela provisória):

| Endereço | Quem abre | Dono |
|---|---|---|
| `#/vagas/:id` | botão "Ver vaga" de Minha candidatura | frente C (Detalhes da Vaga, C03) |
| `#/usuarios/:id` | botão "Ver perfil" da Candidatura do coordenador | frente C (C16) |
| `#/meus-projetos` | Minha candidatura, depois de confirmar o ingresso | dupla B |
| `#/notificacoes` | sino do cabeçalho | dupla B |
| `#/perfil` | avatar do cabeçalho e rodapé do menu | frente C (C16) |

E os endereços das telas de candidatura, para os links das notificações (dupla B):

| Notificação | Link |
|---|---|
| Resultado da avaliação, para o estudante | `#/candidaturas/<id da candidatura>` |
| Nova candidatura, para o coordenador ("Ver candidatura") | `#/candidaturas/recebidas/<id da candidatura>` |
| Candidaturas de uma vaga, a partir da Página do Projeto | `#/candidaturas/recebidas?vagaId=<id da vaga>` |

O botão "Denunciar" (C13, frente C) entra em `paginas/candidatura-recebida.js`,
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
`public/js/exemplo/`, o bloco "DADOS DE EXEMPLO" de `servicos-api.js` (e as
chamadas a `exemplo` e `ouExemplo`), e a faixa `data-exemplo` de
`componentes/estrutura.js`.

## 5. Diferenças em relação aos protótipos

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
