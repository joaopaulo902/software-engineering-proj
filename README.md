# Conexão entre projetos de extensão e alunos do INF

INF01127 — Engenharia de Software — Etapa 2
Implementação do caso de uso **C04 — Candidatar-se à Vaga de Extensão**.

## 1. Arquitetura do Projeto
### 1.1 Sobre a Arquitetura

Arquitetura do projeto segue o padrão Cliente-Servidor/Camadas, com o seguinte diagrama de pacotes:
> **Diagrama de pacotes** · Conexão entre projetos de extensão e alunos do INF · Etapa 2

```mermaid
flowchart TB

   subgraph ClienteWeb ["&laquo;system&raquo; Cliente Web — executa no navegador"]
      paginas["<b>paginas</b><br>telas e navegação"]
      componentes["<b>componentes</b><br>formulários, listas, filtros"]
      servicos_api["<b>servicos_api</b><br>dispara as requisições (fetch)"]
   end

   subgraph ServidorAplicacao ["&laquo;system&raquo; Servidor de Aplicação — um único processo Node.js"]

      subgraph Apresentacao ["Camada de Apresentação"]
         routes["<b>routes</b><br>Express — método + caminho"]
         middlewares["<b>middlewares</b><br>login, log, tratamento de erro"]
         controllers["<b>controllers</b><br>traduz HTTP para o domínio"]
      end

      subgraph Dominio ["Camada de Domínio"]
         Servicos["<b>Serviços</b><br>regras de negócio e controle da transação<br>Vaga · Candidatura · Usuario · Relatorio"]
         Entidades["<b>Entidades</b><br>Usuario · Projeto · Vaga · Candidatura<br>com seus comportamentos"]
      end

      subgraph Persistencia ["Camada de Persistência"]
         Interfaces["<b>Interfaces</b><br>a fachada da camada"]
         Repositorios["<b>Repositórios</b><br>único lugar com SQL"]
         infra_db["<b>infra_db</b><br>conexões, migrations, seed"]
      end

   end

   subgraph Apoio ["Camada de Apoio de Sistema"]
      subgraph postgres ["PostgreSQL"]
         sgbd["<b>sgbd</b><br>&laquo;system&raquo; SGBD relacional"]
      end
      note1["Seta tracejada com ponta aberta = dependência.<br>Cada seta desce exatamente um nível: nenhuma camada<br>pula outra, e não há ciclo de dependência."]
   end

%% Relacionamentos (Conectando os nós internos diretos)
   servicos_api -.- |"&laquo;use&raquo; — conector HTTP / JSON"| routes
   Apresentacao -.- |"&laquo;use&raquo;"| Dominio
   Dominio -.- |"&laquo;use&raquo; — somente pela fachada (passo 6)"| Persistencia
   Persistencia -.- |"&laquo;access&raquo;"| Apoio

%% Estilização
   style Dominio fill:#7a3b3b,stroke:#333,stroke-width:1px
```
### 1.2 Sobre os pacotes
#### 1.2.1 Cliente Web
   O cliente web é um SPA (Single Page Application) e deverá ser escroto usando a biblioteca react.js com componentização. Ele roda no navegador e se comunica com o servidor via HTTP/JSON via express.
   - **páginas**: telas e navegação entre elas.
   - **componentes**: pedaços de interface reutilizados, como formulários, listas e filtros.
   - **serviços_api**: dispara as requisições HTTP para o servidor e trata as respostas.

#### 1.2.2 Servidor de Aplicação
   O servidor de aplicação é um processo Node.js que expõe uma API RESTful e implementa a lógica de negócio.
   - **Camada de Apresentação**: traduz as requisições HTTP para chamadas ao domínio.
     - **routes**: define os endpoints da API e associa métodos HTTP a funções.
     - **middlewares**: funções intermediárias para autenticação, logging e tratamento de erros.
     - **controllers**: recebem as requisições, validam dados e chamam os serviços do domínio.
   - **Camada de Domínio**: contém as regras de negócio e o controle da transação.
     - **Serviços**: implementam as regras de negócio e coordenam a transação entre entidades e repositórios.
     - **Entidades**: representam os objetos do domínio (Usuário, Projeto, Vaga, Candidatura) com seus comportamentos.
   - **Camada de Persistência**: gerencia o acesso ao banco de dados.
     - **Interfaces**: definem a fachada que o domínio utiliza para acessar os repositórios.
     - **Repositórios**: implementam a persistência dos dados, contendo o SQL necessário.
     - **infra_db**: gerencia conexões, migrations e seed do banco.
#### 1.2.3 Camada de Apoio de Sistema
   - **PostgreSQL**: SGBD relacional utilizado para armazenar os dados do sistema.

**Nota**: As setas tracejadas com ponta aberta representam dependências entre os pacotes, garantindo que cada camada só interaja com a camada imediatamente inferior.
## O que está implementado

| Caso de uso                                | Situação                                                |
|--------------------------------------------|---------------------------------------------------------|
| **C04 — Candidatar-se à Vaga de Extensão** | Completo: fluxo básico, fluxos alternativos e transação |
| C01 — Consultar e Filtrar Vagas            | Busca textual (ignora acento) e filtro por área         |
| C05 — Acompanhar Status das Candidaturas   | Listagem das candidaturas do estudante                  |

C01 e C05 entraram porque o C04 não se demonstra sozinho: é preciso escolher
uma vaga antes e ver o resultado depois.

## Como rodar

Qualquer uma das três opções. Em todas, abra depois `http://localhost:3000`.

### 1. Com banco em memória

```bash
npm install
npm run dev:memoria
```

Usa PGlite, o próprio PostgreSQL compilado para WebAssembly, rodando dentro do
Node. Não precisa de Docker nem de PostgreSQL instalado. Os dados voltam ao
estado inicial toda vez que o servidor sobe — o que é bom para a demonstração,
porque dá para repetir o roteiro quantas vezes quiser.

### 2. Com Docker

```bash
npm install
npm run db:up      # sobe o PostgreSQL 16 na porta 5433
npm run dev
```

2.a Para zerar o banco: `npm run db:reset`.

### 3. Com PostgreSQL já instalado na máquina

Crie o banco uma vez:

```bash
psql -U postgres -c "CREATE USER extensao WITH PASSWORD 'extensao';"
psql -U postgres -c "CREATE DATABASE extensao OWNER extensao;"
psql -U extensao -d extensao -f db/01-schema.sql
psql -U extensao -d extensao -f db/02-seed.sql
```

Depois aponte a variável de ambiente para o seu servidor e rode:

```bash
set DATABASE_URL=postgres://extensao:extensao@localhost:5432/extensao
npm run dev
```

## Verificação automática

```bash
npm run verificar
```

Roda o `CandidaturaService` de verdade contra um banco em memória e confere as
14 regras do C04 — fluxo básico, cada fluxo alternativo e a atomicidade da
transação. Nenhum servidor HTTP sobe: é possível justamente porque a regra de
negócio não conhece HTTP nem SQL.


## estrutura do projeto

Cada pasta é um pacote do diagrama de pacotes.

```
seu-projeto/
├── db/
│   ├── 01-schema.sql          # Tabelas e restrições
│   └── 02-seed.sql            # Dados da demonstração
├── public/                    # Subsistema Cliente Web
│   └── js/
│       ├── componentes.js     # Pedaços de interface reutilizados
│       ├── paginas.js         # As telas
│       └── servicos-api.js    # Único lugar que conhece os endereços da API
└── src/
    ├── apresentacao/          # Camada de Apresentação
    │   ├── controllers/       # Traduz HTTP <-> domínio
    │   ├── middlewares/       # ExigirLogin, tratadorDeErros
    │   └── routes/            # Tabela de rotas (Express)
    ├── dominio/               # Camada de Domínio
    │   ├── entidades/         # Usuario, Vaga, Candidatura (com comportamento)
    │   ├── servicos/          # CandidaturaService, VagaService (regras + transação)
    │   └── erros.ts           # Erros de domínio, sem HTTP
    ├── persistencia/          # Camada de Persistência
    │   ├── infra/             # Conexão, transação, banco em memória
    │   ├── interfaces/        # A fachada: o que o domínio enxerga
    │   └── repositorios/      # Implementam a fachada; único lugar com SQL
    └── main.ts                # Raiz de composição: monta tudo e injeta
```

### Regras que o código segue

- Nenhum SQL fora de `persistencia/repositorios`.
- Nenhuma regra de negócio em `controllers`.
- Transação sempre aberta em `dominio/servicos`, nunca no repositório.
- O domínio só enxerga a persistência pelas interfaces.
- `dominio/entidades` não importa nada de Express nem do driver do banco.

## Simplificações do caso de uso implementado

Para o slide de simplificações exigido pelo enunciado:

1. **Login sem autenticação.** O usuário é escolhido numa lista, sem senha.
   Não afeta a arquitetura: `exigirLogin` e os controllers continuam iguais
   quando a autenticação real entrar na Etapa 3.
2. **Notificações (C12) não implementadas.** O texto de retorno diz que o
   coordenador foi notificado, mas o envio em si fica para a Etapa 3.
3. **Avaliação da candidatura (C11) e confirmação de ingresso (C07) fora
   desta etapa.** A candidatura nasce em *Em análise* e permanece assim; a
   máquina de estados completa já está no esquema do banco.
4. **Cadastro de projetos e vagas pelo sistema (C06, C09) não implementado.**
   Os dados vêm do seed.
5. **Busca por texto e área apenas.** Os demais filtros do C01 — turno,
   modalidade, carga horária — ficam para a Etapa 3.
6. **Sem paginação.** O volume de vagas da demonstração não exige.
