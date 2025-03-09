#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import net from 'net';

// Interceptar console.log para garantir que todas as saídas sejam JSON válido
const originalConsoleLog = console.log;
console.log = function() {
  // Converter argumentos para string
  const args = Array.from(arguments).map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  // Se já for um JSON válido, enviar como está
  if (args.trim().startsWith('{') && args.trim().endsWith('}')) {
    originalConsoleLog(args);
  } else {
    // Caso contrário, envolver em um objeto JSON
    originalConsoleLog(JSON.stringify({ message: args }));
  }
};

// Interceptar console.error para garantir que todas as saídas de erro sejam JSON válido
const originalConsoleError = console.error;
console.error = function() {
  // Converter argumentos para string
  const args = Array.from(arguments).map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  // Se já for um JSON válido, enviar como está
  if (args.trim().startsWith('{') && args.trim().endsWith('}')) {
    originalConsoleError(args);
  } else {
    // Caso contrário, envolver em um objeto JSON
    originalConsoleError(JSON.stringify({ error: args }));
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verificar se estamos sendo executados pelo Cursor MCP
// Detectar automaticamente o ambiente Cursor
const isMCPMode = process.argv.includes('--mcp') || 
                  process.env.MCP_MODE === 'true' ||
                  process.env.CURSOR_MCP === 'true' ||
                  process.title.includes('Cursor');

// Função de log que SEMPRE usa JSON para saída no console
const log = (...args) => {
  // Sempre enviar logs como JSON válido
  console.log(JSON.stringify({ 
    type: "log", 
    message: args.join(' '),
    timestamp: new Date().toISOString()
  }));
};

// Função para erros que SEMPRE usa JSON para saída no console
const logError = (...args) => {
  console.error(JSON.stringify({ 
    type: "error", 
    message: args.join(' '),
    timestamp: new Date().toISOString()
  }));
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
        // SEMPRE enviar JSON válido para o console
        console.log(JSON.stringify({ 
          status: "running", 
          port: currentPort,
          timestamp: new Date().toISOString()
        }));
      });
      return;
    }
    
    log(`Porta ${currentPort} já está em uso, tentando próxima...`);
    currentPort++;
    attempts++;
  }
  
  logError(`Não foi possível encontrar uma porta disponível após ${MAX_PORT_ATTEMPTS} tentativas.`);
  process.exit(1);
}

// Capturar erros não tratados e enviar como JSON
process.on('uncaughtException', (err) => {
  logError('Erro não tratado:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Promessa rejeitada não tratada:', reason);
});

// Iniciar o servidor com tratamento de portas
startServer();