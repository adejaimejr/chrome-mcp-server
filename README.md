# Chrome MCP Server

Este é um servidor MCP (Model Context Protocol) que permite a integração entre a extensão Chrome "MCP Debug Tools" e o Claude AI no Cursor.

## Funcionalidades

- Recebe dados da extensão Chrome via API RESTful
- Disponibiliza estes dados como ferramentas MCP para o Claude AI
- Interface web para visualizar os dados armazenados
- Notificações em tempo real via Socket.IO

## Instalação e Uso

### Opção 1: Usar diretamente do GitHub (recomendado)

Você pode executar o servidor diretamente do GitHub sem instalar:

```bash
# No Windows
cmd /c npx github:adejaimejr/chrome-mcp-server

# No Linux/Mac
npx github:adejaimejr/chrome-mcp-server
```

### Opção 2: Instalar globalmente do GitHub

```bash
npm install -g github:adejaimejr/chrome-mcp-server
chrome-mcp-server
```

### Opção 3: Instalar a partir do npm

Se o pacote estiver publicado no npm, você pode usar:

```bash
# No Windows
cmd /c npx chrome-mcp-server

# No Linux/Mac
npx chrome-mcp-server
```

## Configuração no Cursor

Para configurar o Cursor para usar este servidor:

1. Abra Configurações > MCP Servers
2. Clique em "Add new MCP server"
3. Preencha os campos:
   - Nome: Chrome Debug Tools
   - Tipo: command
   - Comando: 
     - Windows: `cmd /c npx github:adejaimejr/chrome-mcp-server --mcp`
     - Linux/Mac: `npx github:adejaimejr/chrome-mcp-server --mcp`

**Importante**: O parâmetro `--mcp` é essencial para que o servidor funcione corretamente com o Cursor, pois ele suprime mensagens de log que podem interferir na comunicação.

## Solução de Problemas

Se você encontrar o erro "Unexpected token 'A', 'Aguardando'... is not valid JSON", certifique-se de:

1. Adicionar o parâmetro `--mcp` ao comando
2. Verificar se o Node.js está instalado e acessível no PATH
3. Tentar executar o comando diretamente no terminal para verificar se funciona

## Como Usar

### 1. Configuração Completa

1. Instale a extensão Chrome "MCP Debug Tools"
2. Inicie o servidor MCP com um dos comandos acima
3. Configure o Cursor para usar o servidor MCP
4. Use a extensão para capturar dados do navegador
5. Os dados estarão disponíveis para o Claude AI como ferramentas MCP

### 2. Interface Web

Você pode acessar http://localhost:3000 para visualizar os dados armazenados e monitorar as atualizações em tempo real.

## Comunicação

### Da Extensão para o Servidor

A extensão envia dados para o servidor via POST para `/api/chrome-extension/data` com o seguinte formato:

```json
{
  "action": "getConsoleLogs",
  "data": {
    "logs": [...]
  }
}
```

### Do Servidor para o Claude AI

O Claude AI pode acessar os dados via GET para `/api/mcp/getConsoleLogs` e outras rotas similares.

## Ferramentas MCP Disponíveis

- `getConsoleLogs` - Obtém logs do console
- `getConsoleErrors` - Obtém erros do console
- `getNetworkErrorLogs` - Obtém erros de rede
- `getNetworkSuccessLogs` - Obtém sucessos de rede
- `takeScreenshot` - Obtém screenshot da página
- `getSelectedElement` - Obtém elemento HTML selecionado
- `wipeLogs` - Limpa todos os logs

## Requisitos

- Node.js 14+
- Chrome 88+
- Cursor com suporte a MCP

## Notas de Segurança

Este servidor é destinado apenas para uso de desenvolvimento. Não exponha este servidor à internet pública sem implementar medidas de segurança adicionais.