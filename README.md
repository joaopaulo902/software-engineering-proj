# Conexão entre projetos de extensão e alunos do INF

INF01127 — Engenharia de Software — Etapa 2
Implementação do caso de uso **C04 — Candidatar-se à Vaga de Extensão**.

## O que está implementado

| Caso de uso | Situação |
| --- | --- |
| **C04 — Candidatar-se à Vaga de Extensão** | Completo: fluxo básico, fluxos alternativos e transação |
| C01 — Consultar e Filtrar Vagas | Busca textual (ignora acento) e filtro por área |
| C05 — Acompanhar Status das Candidaturas | Listagem das candidaturas do estudante |

C01 e C05 entraram porque o C04 não se demonstra sozinho: é preciso escolher
uma vaga antes e ver o resultado depois.

## Como rodar

Qualquer uma das três opções. Em todas, abra depois `http://localhost:3000`.

### 1. Sem instalar nada (recomendado para a apresentação)

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

Para zerar o banco: `npm run db:reset`.

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

## Roteiro da demonstração

Os dados de exemplo foram montados para que cada regra possa ser mostrada.

1. **Caminho feliz.** Entre como **Diego Alves (4º semestre)**. Busque por
   `web`. Candidate-se a **Desenvolvimento Web** — ele cumpre o semestre
   mínimo. O contador cai de `1 de 1` para `0 de 1`.
2. **Acompanhamento (C05).** Abra a aba **Minhas candidaturas**: a candidatura
   aparece com status *Em análise*.
3. **Vaga esgotada.** Saia e entre como **Carla Dias (7º semestre)**. Tente a
   mesma vaga de Desenvolvimento Web: *"Esta vaga não tem mais posições
   disponíveis."*
4. **Pré-requisito de semestre.** Entre como **Bruno Lima (2º semestre)** e
   tente a **Oficina de Dados**, que exige o 6º: *"Esta vaga exige estar no 6º
   semestre ou acima. Você está no 2º."* Repare que o contador **não muda** —
   a transação foi desfeita.
5. **Candidatura repetida.** Entre como **Ana Souza (5º semestre)** e tente a
   **Monitoria de Algoritmos**, à qual ela já se candidatou: *"Você já se
   candidatou a esta vaga."*
6. **Permissão por papel.** Entre como **Profa. Carla Menezes** e tente
   qualquer vaga: *"Apenas estudantes podem se candidatar a vagas."*

A regra de prazo encerrado (vaga *Apoio em Eletrônica*) não aparece na tela
porque a listagem só traz vagas abertas; ela é demonstrada pelo
`npm run verificar`.

## Onde está cada coisa

Cada pasta é um pacote do diagrama de pacotes.

```
src/
  apresentacao/          Camada de Apresentação
    routes/              tabela de rotas (Express)
    middlewares/         exigirLogin, tratadorDeErros
    controllers/         traduz HTTP <-> domínio
  dominio/               Camada de Domínio
    entidades/           Usuario, Vaga, Candidatura (com comportamento)
    servicos/            CandidaturaService, VagaService (regras + transação)
    erros.ts             erros de domínio, sem HTTP
  persistencia/          Camada de Persistência
    interfaces/          a fachada: o que o domínio enxerga
    repositorios/        implementam a fachada; único lugar com SQL
    infra/               conexão, transação, banco em memória
  main.ts                raiz de composição: monta tudo e injeta
public/                  Subsistema Cliente Web
  js/servicos-api.js     único lugar que conhece os endereços da API
  js/componentes.js      pedaços de interface reutilizados
  js/paginas.js          as telas
db/
  01-schema.sql          tabelas e restrições
  02-seed.sql            dados da demonstração
```

### Regras que o código segue

- Nenhum SQL fora de `persistencia/repositorios`.
- Nenhuma regra de negócio em `controllers`.
- Transação sempre aberta em `dominio/servicos`, nunca no repositório.
- O domínio só enxerga a persistência pelas interfaces.
- `dominio/entidades` não importa nada de Express nem do driver do banco.

## O ponto técnico do C04

A candidatura precisa ser atômica. Se a verificação de posições disponíveis e a
inserção acontecessem separadas, dois estudantes clicando ao mesmo tempo
poderiam ocupar a mesma última vaga.

`CandidaturaService.candidatar` abre uma transação e, dentro dela, a primeira
coisa que faz é travar a linha da vaga:

```sql
SELECT * FROM vaga WHERE id = $1 FOR UPDATE
```

Qualquer outra transação que peça a mesma vaga espera aí até esta terminar.
Verificar, inserir e descontar acontecem como uma operação indivisível.

Há ainda duas barreiras no próprio banco, caso alguma verificação escape:

- `UNIQUE (vaga_id, estudante_id)` torna impossível candidatar-se duas vezes;
- `CHECK (vagas_restantes >= 0)` impede o contador de furar.

## Simplificações declaradas

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
