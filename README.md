# Conexão entre projetos de extensão e alunos do INF

INF01127 — Engenharia de Software — Etapa 2
Implementação dos casos de uso **C04 — Candidatar-se à Vaga de Extensão** e
**C06 — Publicar Vaga de Projeto**.

## 1. Arquitetura do Projeto
### 1.1 Sobre a Arquitetura

Arquitetura do projeto segue o padrão Cliente-Servidor/Camadas, com o seguinte diagrama de pacotes:
> **Diagrama de pacotes** · Conexão entre projetos de extensão e alunos do INF · Etapa 2

![Descrição do Diagrama](./diagrams/package.svg)

### 1.2 Sobre os pacotes
#### 1.2.1 Cliente Web
   O cliente web é um SPA (Single Page Application) e deverá ser escrito usando a biblioteca react.js para componentização. Ele roda no navegador e se comunica com o servidor via HTTP/JSON via express.
   - **páginas**: telas e navegação entre elas.
   - **componentes**: pedaços de interface reutilizados, como formulários, listas e filtros.
   - **serviços_api**: dispara as requisições HTTP para o servidor e trata as respostas, disponibilizando os dados para os componentes.

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
| **C06 — Publicar Vaga de Projeto**         | Completo: fluxo básico, fluxos alternativos e transação |

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

Roda os serviços de domínio de verdade contra um banco em memória e confere as
33 regras do C04, C05 e C06 — fluxo básico, cada fluxo alternativo e a
atomicidade das transações. Nenhum servidor HTTP sobe: é possível justamente
porque a regra de negócio não conhece HTTP nem SQL.


## Estrutura do projeto

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
    │   ├── entidades/         # Usuario, Projeto, Vaga, Candidatura (com comportamento)
    │   ├── servicos/          # CandidaturaService, VagaService (regras + transação)
    │   ├── calendario.ts      # Convenção única para datas de prazo
    │   └── erros.ts           # Erros de domínio, sem HTTP
    ├── persistencia/          # Camada de Persistência
    │   ├── infra/             # Conexão, transação, banco em memória
    │   ├── interfaces/        # A fachada: o que o domínio enxerga
    │   └── repositorios/      # Implementam a fachada; único lugar com SQL
    └── main.ts                # Raiz de composição: monta tudo e injeta
```

### Regras do código

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
4. **Cadastro de projetos pelo sistema (C09) não implementado.** Os projetos
   vêm do seed, como se a Comissão de Extensão já os tivesse cadastrado — que
   é a pré-condição do C06. As vagas, essas sim, são publicadas pelo C06.
5. **Busca por texto e área apenas.** Os demais filtros do C01 — turno,
   modalidade, carga horária — ficam para a Etapa 3.
6. **Sem paginação.** O volume de vagas da demonstração não exige.

Ferramentas usadas:
- Node.js
- TypeScript
- Express
- PostgreSQL
Para documentação:
- https://mermaid.ai/app/projects/ae5429b6-03b8-44b0-a4e2-04aa33d0683e/diagrams/7b982225-0751-46b7-9337-c0780e933203/version/v0.1/edit
- https://lucid.app/lucidspark/96d1ee67-21e5-458b-8fa6-18d5327fa691/edit?viewport_loc=-12773%2C-6611%2C25142%2C11949%2C0_0&invitationId=inv_6d878542-89f8-4cd1-9a66-65c7fd7c1fb5
