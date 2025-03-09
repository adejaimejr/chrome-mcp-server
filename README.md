# Chrome MCP Server

Um servidor Node.js que se integra com a extensão Chrome DevTools para fornecer funcionalidades de depuração e monitoramento para o Cursor AI.

## Funcionalidade

Este servidor atua como uma ponte entre a extensão Chrome DevTools e o Cursor AI, permitindo:

- Capturar logs do console
- Capturar erros do console
- Monitorar requisições de rede (sucessos e erros)
- Capturar screenshots
- Inspecionar elementos selecionados
- Limpar logs

## Instalação e Uso

Existem várias opções para executar o servidor:

### Opção 1: Executar diretamente do GitHub

```bash
# Windows
cmd /c npx github:adejaimejr/chrome-mcp-server

# Linux/Mac
npx github:adejaimejr/chrome-mcp-server
```

### Opção 2: Instalar globalmente

```bash
# Instalar globalmente
npm install -g github:adejaimejr/chrome-mcp-server

# Executar
chrome-mcp-server
```

### Opção 3: Publicar no npm

Se você preferir usar o formato de comando `npx @scope/package`, você pode publicar este pacote no npm:

Para publicar sem escopo:
```bash
npm login
npm publish
```
Depois poderá usar: `npx chrome-mcp-server`

Para publicar com escopo:
```bash
# Modifique o nome no package.json para "@adejaimejr/chrome-mcp-server"
npm publish --access public
```
Depois poderá usar: `npx @adejaimejr/chrome-mcp-server`

## Configuração no Cursor

Para configurar o servidor MCP no Cursor:

1. Abra o Cursor
2. Vá para Configurações (ícone de engrenagem)
3. Navegue até "Extensões" > "MCP"
4. Adicione um novo servidor MCP com o comando:

```
# Windows
cmd /c npx github:adejaimejr/chrome-mcp-server

# Linux/Mac
npx github:adejaimejr/chrome-mcp-server
```

**Nota**: A partir da versão mais recente, o parâmetro `--mcp` não é mais necessário, pois o servidor agora detecta automaticamente quando está sendo executado pelo Cursor.

### Solução Específica para Instalação Local

Se você já tem o código em seu computador (como no caminho `C:\Users\Adejaime\Desktop\2025-dev\chrome-mcp-server`), use o caminho direto para o arquivo executável:

```
node C:\Users\Adejaime\Desktop\2025-dev\chrome-mcp-server\dist\mcp-server.js
```

Importante: No Windows, você pode usar tanto barras invertidas (`\`) quanto barras normais (`/`) no caminho.

### Passo a Passo para Instalação Local

Se você preferir clonar o repositório e usar localmente:

```bash
# 1. Clone o repositório
git clone https://github.com/adejaimejr/chrome-mcp-server.git

# 2. Entre no diretório
cd chrome-mcp-server

# 3. Instale as dependências
npm install

# 4. Construa o executável
npm run build

# 5. Configure o Cursor com o caminho absoluto para o arquivo mcp-server.js
# Exemplo no Windows:
# node C:\caminho\completo\para\chrome-mcp-server\dist\mcp-server.js

# Exemplo no Linux/Mac:
# node /caminho/completo/para/chrome-mcp-server/dist/mcp-server.js
```

## Novidades na Versão Mais Recente

### 1. Tratamento Automático de Portas

O servidor agora detecta automaticamente quando a porta padrão (3000) está ocupada e tenta portas alternativas (3001, 3002, etc.) até encontrar uma disponível. Isso resolve o erro `EADDRINUSE: address already in use` que pode ocorrer quando outro serviço já está usando a porta 3000.

Benefícios:
- Não é necessário encerrar outros serviços que estejam usando a porta 3000
- O servidor informa automaticamente ao Cursor qual porta está usando
- Tenta até 10 portas diferentes antes de desistir

### 2. Saída Sempre em Formato JSON

O servidor agora sempre envia respostas em formato JSON válido, mesmo sem o parâmetro `--mcp`. Isso resolve o erro `Unexpected token 'A', "Aguardando"... is not valid JSON` que podia ocorrer na configuração do Cursor.

### 3. Script de Build Compatível com Windows

O script de build agora é compatível com Windows e Linux/Mac, usando o Node.js para criar diretórios e copiar arquivos em vez de comandos específicos do sistema operacional. Isso resolve o erro `mkdir -p` que ocorria ao executar `npm run build` no Windows.

## Resolução de Problemas

### Erro: "Falha ao analisar a resposta JSON" ou "Unexpected token... is not valid JSON"

Se você encontrar um erro relacionado a JSON inválido:

1. Certifique-se de que está usando a versão mais recente do servidor
2. Atualize o repositório local com `git pull` e reconstrua com `npm run build`
3. Tente usar o caminho absoluto para o arquivo `mcp-server.js` como mostrado na seção "Solução Específica para Instalação Local"

### Erro: "EADDRINUSE: address already in use"

Este erro ocorre quando a porta 3000 já está sendo usada por outro processo. A nova versão do servidor resolve isso automaticamente tentando portas alternativas.

Se ainda encontrar problemas:
1. Verifique se você está usando a versão mais recente do servidor
2. Tente encerrar manualmente o processo que está usando a porta 3000
3. Defina uma porta específica usando a variável de ambiente PORT:
   ```
   # Windows
   set PORT=3001 && node C:\caminho\para\mcp-server.js
   
   # Linux/Mac
   PORT=3001 node /caminho/para/mcp-server.js
   ```

### Erro: "mkdir -p" ou "chmod +x" no Windows

Se você encontrar erros relacionados a comandos Unix ao executar `npm run build` no Windows:

1. Certifique-se de que está usando a versão mais recente do repositório com o script de build compatível com Windows
2. Execute `git pull` para obter as últimas atualizações
3. Se o problema persistir, você pode criar manualmente o arquivo:
   - Copie o conteúdo de `src/index.js` para um novo arquivo `dist/mcp-server.js`
   - Adicione `#!/usr/bin/env node` no início do arquivo

## Como Funciona

1. A extensão Chrome DevTools coleta informações do navegador
2. A extensão envia esses dados para o servidor MCP local
3. O servidor armazena os dados e os disponibiliza via API RESTful
4. O Claude AI no Cursor acessa esses dados através das ferramentas MCP

## Ferramentas MCP Disponíveis

- `getConsoleLogs`: Obtém logs do console
- `getConsoleErrors`: Obtém erros do console
- `getNetworkErrorLogs`: Obtém logs de erros de rede
- `getNetworkSuccessLogs`: Obtém logs de sucesso de rede
- `takeScreenshot`: Captura uma screenshot da página
- `getSelectedElement`: Obtém informações sobre o elemento selecionado
- `wipeLogs`: Limpa todos os logs armazenados

## Requisitos

- Node.js 14+
- Chrome 88+
- Cursor com suporte a MCP

## Notas de Segurança

Este servidor é destinado apenas para uso local durante o desenvolvimento. Não exponha este servidor à internet pública sem medidas adicionais de segurança.