#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verificar se estamos sendo executados pelo Cursor MCP
const isMCPMode = process.argv.includes('--mcp') || 
                  process.env.MCP_MODE === 'true' ||
                  process.env.CURSOR_MCP === 'true';

// Função de log que só exibe mensagens quando não estiver em modo MCP
const log = (...args) => {
  if (!isMCPMode) {
    console.log(...args);
  }
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Definir portas para tentar, começando com a padrão
const DEFAULT_PORT = process.env.PORT || 3000;
const MAX_PORT_ATTEMPTS = 10; // Tentar até 10 portas diferentes

// Armazenamento de dados em memória (pode ser substituído por um banco de dados em produção)
const storage = {
  consoleLogs: [],
  consoleErrors: [],
  networkErrorLogs: [],
  networkSuccessLogs: [],
  latestScreenshot: null,
  selectedElement: null
};

// Middleware para permitir CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rota estática para servir a página de cliente de teste
app.use(express.static(join(__dirname, '..', 'public')));

// Rotas da API RESTful para MCP
app.get('/api/mcp/getConsoleLogs', (req, res) => {
  res.json({ logs: storage.consoleLogs });
});

app.get('/api/mcp/getConsoleErrors', (req, res) => {
  res.json({ logs: storage.consoleErrors });
});

app.get('/api/mcp/getNetworkErrorLogs', (req, res) => {
  res.json({ logs: storage.networkErrorLogs });
});

app.get('/api/mcp/getNetworkSuccessLogs', (req, res) => {
  res.json({ logs: storage.networkSuccessLogs });
});

app.get('/api/mcp/getSelectedElement', (req, res) => {
  res.json({ element: storage.selectedElement });
});

app.get('/api/mcp/takeScreenshot', (req, res) => {
  res.json({ screenshot: storage.latestScreenshot });
});

app.post('/api/mcp/wipeLogs', (req, res) => {
  storage.consoleLogs = [];
  storage.consoleErrors = [];
  storage.networkErrorLogs = [];
  storage.networkSuccessLogs = [];
  storage.latestScreenshot = null;
  storage.selectedElement = null;
  res.json({ success: true });
});

// Receber dados da extensão Chrome
app.post('/api/chrome-extension/data', (req, res) => {
  const { action, data } = req.body;
  
  switch (action) {
    case 'getConsoleLogs':
      if (data && data.logs) {
        storage.consoleLogs = data.logs;
      }
      break;
    case 'getConsoleErrors':
      if (data && data.logs) {
        storage.consoleErrors = data.logs;
      }
      break;
    case 'getNetworkErrorLogs':
      if (data && data.logs) {
        storage.networkErrorLogs = data.logs;
      }
      break;
    case 'getNetworkSuccessLogs':
      if (data && data.logs) {
        storage.networkSuccessLogs = data.logs;
      }
      break;
    case 'takeScreenshot':
      if (data && data.screenshot) {
        storage.latestScreenshot = data.screenshot;
      }
      break;
    case 'getSelectedElement':
      if (data && data.element) {
        storage.selectedElement = data.element;
      }
      break;
    case 'wipeLogs':
      storage.consoleLogs = [];
      storage.consoleErrors = [];
      storage.networkErrorLogs = [];
      storage.networkSuccessLogs = [];
      storage.latestScreenshot = null;
      storage.selectedElement = null;
      break;
  }
  
  // Notificar todos os clientes conectados via Socket.IO
  io.emit('dataUpdated', { action, timestamp: new Date().toISOString() });
  
  res.json({ success: true });
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
  log('Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    log('Cliente desconectado:', socket.id);
  });
});

// Rota para verificação de saúde do servidor (health check)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Função para verificar se uma porta está disponível
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

// Função para iniciar o servidor com tentativas de portas alternativas
async function startServer() {
  let currentPort = DEFAULT_PORT;
  let attempts = 0;
  
  while (attempts < MAX_PORT_ATTEMPTS) {
    const available = await isPortAvailable(currentPort);
    
    if (available) {
      server.listen(currentPort, () => {
        // Sempre enviar a porta em formato JSON para o Cursor capturar
        console.log(JSON.stringify({ port: currentPort, status: "running" }));
        
        // Logs adicionais apenas se não estiver em modo MCP
        if (!isMCPMode) {
          log(`Servidor MCP rodando em http://localhost:${currentPort}`);
          log('Aguardando conexões...');
        }
      });
      return;
    }
    
    log(`Porta ${currentPort} já está em uso, tentando próxima...`);
    currentPort++;
    attempts++;
  }
  
  // Erro em formato JSON para o Cursor
  console.error(JSON.stringify({ 
    error: `Não foi possível encontrar uma porta disponível após ${MAX_PORT_ATTEMPTS} tentativas.` 
  }));
  process.exit(1);
}

// Iniciar o servidor com tratamento de portas
startServer();