# Chrome MCP Server

Este é um servidor MCP (Model Context Protocol) que permite a integração entre a extensão Chrome "MCP Debug Tools" e o Claude AI no Cursor.

## Funcionalidades

- Recebe dados da extensão Chrome via API RESTful
- Disponibiliza estes dados como ferramentas MCP para o Claude AI
- Interface web para visualizar os dados armazenados
- Notificações em tempo real via Socket.IO