# Next.js Template com shadcn/ui

Este é um template Next.js configurado para usar shadcn/ui.

## Sincronização da escala

A aplicação lê a planilha `Escala COD 2026.xlsx` de um bucket privado do Supabase
e interpreta o arquivo no servidor. O script local envia o arquivo inicial e
pode continuar monitorando alterações, substituindo o mesmo objeto no Storage.

### Configurar Supabase e Vercel

1. No SQL Editor do Supabase, execute
   `supabase/migrations/20261025000000_create_operator_schedule_bucket.sql`.
   Isso cria o bucket privado `operator-schedule`.
2. Configure na Vercel `SUPABASE_SERVICE_ROLE_KEY` com a chave secreta do
   projeto Supabase. Essa variável é usada somente pelo servidor e não deve ter
   o prefixo `NEXT_PUBLIC_`.
3. Gere um token aleatório, por exemplo:

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

4. Configure esse valor como `HOST_UPLOAD_TOKEN` nas variáveis de ambiente da
   Vercel e faça um novo deploy. Não compartilhe nem publique o token.

### Configurar o computador que contém a planilha

1. Copie `host-sync.example.env` para `host-sync.env` na raiz do projeto.
   O arquivo real é ignorado pelo Git.
2. Edite `host-sync.env` com a URL da aplicação Vercel, o mesmo token
   `HOST_UPLOAD_TOKEN` e o caminho local do arquivo:

   ```text
   HOST_SYNC_URL=https://sua-aplicacao.vercel.app/api/host/sync
   HOST_UPLOAD_TOKEN=seu-token-aleatorio
   SCHEDULE_FILE=C:\caminho\Escala COD 2026.xlsx
   ```

3. Envie uma vez para validar a configuração e publicar a planilha inicial:

   ```powershell
   python scripts\host_sync.py --once
   ```

4. Para manter o monitoramento ativo, execute:

   ```powershell
   python scripts\host_sync.py
   ```

   Deixe o terminal aberto no computador que contém o arquivo. O script verifica
   alterações periodicamente, espera o arquivo terminar de ser salvo e envia
   novamente. `Ctrl+C` encerra o monitoramento.

O envio aceita somente arquivos XLSX válidos para o layout esperado, com limite
de 4 MB. O bucket é privado, e a chave administrativa do Supabase nunca é
colocada no computador host. O token autoriza somente o endpoint de sincronização.

## Página inicial

Ao abrir a aplicação, `/` redireciona para `/inicio`. A página exibe a
identidade do Apoio Operacional e uma galeria das rotas mais acessadas pela
equipe. Os acessos são agregados por rota, sem armazenar a identidade do usuário.
Para habilitar as estatísticas, execute
`supabase/migrations/20261111000100_create_route_usage.sql` no SQL Editor do
Supabase.

## Endpoint de usuários

`/usuarios` exibe os usuários autenticados em cartões de perfil com foto, nome,
sobrenome e telefone. A página consome `GET /api/users`, que também pode ser
usado diretamente e retorna esses dados em JSON. A rota exige uma sessão
autenticada e usa
`SUPABASE_SERVICE_ROLE_KEY` somente no servidor. Configure essa chave também no
`.env.local` para usar o endpoint no ambiente local; nunca use o prefixo
`NEXT_PUBLIC_` nem exponha a chave ao navegador.

## Contatos compartilhados

`/contatos` oferece uma lista compartilhada de contatos com busca por nome,
telefone, empresa e usuário responsável. Qualquer usuário autenticado pode
cadastrar, editar ou excluir pessoas. Cada registro contém nome, sobrenome,
telefone principal, telefone secundário opcional, empresa e auditoria de
quem cadastrou e atualizou por último. Cada usuário autenticado também possui
uma pessoa vinculada, sincronizada com o nome e os telefones do perfil; pessoas
sem conta permanecem contatos independentes. Pessoas vinculadas a contas não
podem ser excluídas.

A página consome `GET`, `POST`, `PATCH` e `DELETE /api/contacts`. Os caminhos
o endereço anterior `/Pessoas` e a API `/api/people` continuam disponíveis
para compatibilidade.

Antes de usar a página, execute em ordem no SQL Editor do projeto Supabase:

1. `supabase/migrations/20261108000000_create_shared_people.sql`
2. `supabase/migrations/20261108000100_link_users_to_people.sql`
3. `supabase/migrations/20261111000200_create_companies.sql`
4. `supabase/migrations/20261111000300_add_company_audit.sql`
5. `supabase/migrations/20261111000400_add_company_icon_and_color.sql`
6. `supabase/migrations/20261111000500_use_full_game_icon_catalog.sql`
7. `supabase/migrations/20261111000600_default_company_color_black.sql`

A segunda migration vincula os usuários existentes e configura a sincronização
automática para novas contas e mudanças no perfil. Editar o contato de uma
pessoa vinculada também atualiza o nome e os telefones do perfil. A tabela usa
Row Level Security para permitir operações somente a usuários autenticados; a
auditoria é preenchida no banco.

`/empresas` e `/api/companies` permitem que usuários autenticados cadastrem,
atualizem e excluam as opções de empresa. No formulário de contatos, uma empresa
cadastrada pode ser encontrada pela busca e selecionada por rádio. Se não existir,
é possível cadastrá-la diretamente pela busca, sem sair do formulário. O campo
da pessoa continua armazenando texto: renomear ou excluir uma opção não altera
os contatos que já a utilizam. As empresas exibem quem cadastrou e quem fez a
última atualização; essa auditoria é preenchida e protegida pelo banco de dados.
Também é possível escolher um ícone e uma cor para cada empresa.
No cadastro de conta, é possível selecionar uma empresa existente, com seu ícone
e sua cor. A foto de perfil usa o mesmo catálogo de ícones pesquisável e permite
escolher uma cor de fundo; essa escolha aparece no menu do usuário e na lista de
usuários. A empresa selecionada é sincronizada com o contato vinculado à conta.
Novas empresas usam preto como cor padrão, e o ícone da empresa aparece no
avatar dos contatos vinculados a ela.

A seleção de ícones pesquisa os 4.180 SVGs locais por nome ou autor, com
paginação. Os ícones são do [Game-icons.net](https://game-icons.net/); consulte
`public/game-icons.net.svg/icons/license.txt` para créditos dos autores e
licenças (CC BY 3.0 ou CC0, conforme o ícone).

## Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Python 3.9 ou superior no computador que monitora a planilha

## Configuração

1. Inicialize shadcn/ui:
