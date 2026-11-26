# Backlog do produto - Athletix Web

Entrega e apresentação: **01/12/2026**, Laboratório 309.

| Integrante | Papel principal |
|---|---|
| Kaio Sobral Moreira | Back-end, banco de dados, revisão e integração |
| Matheus Damasceno Glória | Front-end (responsável principal) |
| Kevily da Silva Oliveira | Documentação, tela de usuários, validações e testes |

## Quadro Kanban

Ao mudar o status de um cartão, mova a linha para a coluna correspondente.
Limite: no máximo 2 cartões em andamento por pessoa.

### A fazer

| ID | Tarefa | Responsável | Branch | Prioridade | Prazo |
|---|---|---|---|---|---|
| F-01 | Base do front: `style.css`, menu e cliente da API em JavaScript | Matheus | `feature/front-base` | Alta | 27/11 |
| F-02 | Tela de login e cadastro, guardando o token e com botão de sair | Matheus | `feature/front-login` | Alta | 27/11 |
| F-03 | Tela de quadras: listagem para todos, cadastro e edição para o administrador | Matheus | `feature/front-quadras` | Alta | 28/11 |
| F-04 | Tela de reservas: formulário, disponibilidade, listagem, filtros e cancelamento | Matheus | `feature/front-reservas` | Alta | 29/11 |
| F-05 | Responsividade das telas | Matheus | `feature/front-responsivo` | Média | 29/11 |
| F-06 | Tela de usuários (somente administrador) | Kevily | `feature/front-usuarios` | Média | 28/11 |
| B-01 | Retornar 400 quando o id da rota não for um número (hoje retorna 500) | Kevily | `feature/validar-id` | Média | 28/11 |
| B-02 | Impedir reserva em horário que já passou no dia atual | Kevily | `feature/validar-horario` | Média | 28/11 |
| D-01 | Wireframes das telas (alinhar com Matheus) | Kevily | `feature/docs-wireframes` | Alta | 27/11 |
| D-02 | DER e modelo relacional | Kevily | `feature/docs-der` | Alta | 28/11 |
| D-03 | `README.md` com instalação e execução | Kevily | `feature/docs-readme` | Alta | 28/11 |
| D-04 | Especificação das rotas: métodos, URLs, payloads e respostas | Kevily | `feature/docs-rotas` | Alta | 29/11 |
| D-05 | Relatório técnico: capa, introdução, justificativa, requisitos e anexos | Kevily | `feature/docs-relatorio` | Alta | 29/11 |
| D-06 | Descrição técnica do código (cada um escreve a sua parte) | Todos | `feature/docs-codigo` | Alta | 29/11 |
| G-01 | Adicionar integrantes e professor como colaboradores no GitHub | Kaio | - | Alta | 26/11 |
| G-02 | Revisar os pull requests e integrar na `develop` | Kaio | - | Alta | 29/11 |
| G-03 | Teste completo e release `1.0.0` na `main` | Todos | `release/1.0.0` | Alta | 30/11 |
| G-04 | Ensaio da apresentação (15 min) e estudo de todo o código | Todos | - | Alta | 30/11 |

### Em andamento

| ID | Tarefa | Responsável | Branch | Prioridade | Prazo |
|---|---|---|---|---|---|
| B-03 | Rotas de autenticação, quadras, usuários e reservas | Kaio | `feature/*` | Alta | 26/11 |

### Em revisão

| ID | Tarefa | Responsável | Branch | Prioridade | Prazo |
|---|---|---|---|---|---|

### Concluído

| ID | Tarefa | Responsável |
|---|---|---|
| P-01 | Proposta enviada e aprovada pelo professor | Equipe |
| B-04 | `schema.sql` com tabelas, trigger e dados iniciais | Kaio |
| B-05 | Servidor Express e conexão com o PostgreSQL | Kaio |

## Git Flow

| Branch | Uso |
|---|---|
| `main` | Somente versões prontas (releases) |
| `develop` | Integração do trabalho em andamento |
| `feature/nome` | Uma tarefa do quadro; sai da `develop` e volta para ela |
| `release/x.y.z` | Preparação de uma versão antes de ir para a `main` |
| `hotfix/nome` | Correção urgente a partir da `main` |

Passo a passo de uma tarefa:

```
git checkout develop
git pull
git checkout -b feature/front-login
git add .
git commit -m "feat(front): adiciona tela de login"
git push -u origin feature/front-login
```

Depois, abra um pull request da branch para a `develop` no GitHub.

Mensagens de commit: `tipo(escopo): descrição`, usando `feat`, `fix`, `docs`,
`style`, `refactor`, `test` ou `chore`. Sem emojis.

## Pronto significa

- Funciona no navegador ou na API, sem erros no console.
- Segue o padrão do projeto: HTML, CSS e JavaScript puros no front; Express e `pg` no back.
- Quem fez sabe explicar o código na arguição.

## Rotas disponíveis para o front

Todas começam com `/api`. Fora do cadastro e do login, envie o cabeçalho
`Authorization: Bearer <token>`. Erros chegam como `{ "erro": "mensagem" }`.

| Método e rota | Corpo ou filtros | Acesso |
|---|---|---|
| `POST /auth/cadastro` | `nome, email, senha` | Público |
| `POST /auth/login` | `email, senha` | Público |
| `POST /auth/logout` | - | Logado |
| `GET /auth/me` | - | Logado |
| `GET /quadras`, `GET /quadras/:id` | - | Logado |
| `GET /quadras/:id/disponibilidade` | `?data=AAAA-MM-DD` | Logado |
| `POST /quadras`, `PUT /quadras/:id` | `nome, modalidade, tamanho, valorHora, descricao` | Admin |
| `DELETE /quadras/:id` | - | Admin |
| `GET /usuarios` | - | Admin |
| `POST /usuarios`, `PUT /usuarios/:id` | `nome, email, senha, perfil` | Admin |
| `DELETE /usuarios/:id` | - | Admin |
| `GET /reservas` | `?data=&quadraId=&usuarioId=&status=` | Logado (cliente vê as próprias) |
| `GET /reservas/minhas`, `GET /reservas/:id` | - | Logado |
| `POST /reservas`, `PUT /reservas/:id` | `quadraId, data, horaInicio, horaFim` (admin pode enviar `usuarioId` no POST) | Dono ou admin |
| `PATCH /reservas/:id/cancelar` | - | Dono ou admin |
| `DELETE /reservas/:id` | - | Admin |
