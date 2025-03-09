#!/usr/bin/env node

// FORÇAR MODO MCP PARA GARANTIR QUE TUDO SEJA JSON
process.env.MCP_MODE = 'true';

// INTERCEPTAR STDOUT E STDERR DIRETAMENTE
// Isso garante que TODA saída, incluindo mensagens antes da inicialização do app, seja em JSON
const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

// Sobrescrever process.stdout.write para garantir que toda saída seja JSON válido
process.stdout.write = function(chunk, encoding, callback) {
  try {
    // Converter para string se não for
    let strChunk = typeof chunk === 'string' ? chunk : chunk.toString();
    
    // Verificar se já é JSON válido
    if (strChunk.trim().startsWith('{') && strChunk.trim().endsWith('}')) {
      // Se parece ser JSON, apenas passar adiante
      return originalStdoutWrite.apply(process.stdout, arguments);
    } else {
      // Envolver em JSON e adicionar uma nova linha
      return originalStdoutWrite.call(
        process.stdout, 
        JSON.stringify({ message: strChunk.trim() }) + '\n',
        encoding,
        callback
      );
    }
  } catch (e) {
    // Se algo der errado, pelo menos garantir que a saída seja JSON
    return originalStdoutWrite.call(
      process.stdout,
      JSON.stringify({ error: "Erro ao processar saída", message: String(chunk) }) + '\n',
      encoding,
      callback
    );
  }
};

// Sobrescrever process.stderr.write para garantir que toda saída de erro seja JSON válido
process.stderr.write = function(chunk, encoding, callback) {
  try {
    // Converter para string se não for
    let strChunk = typeof chunk === 'string' ? chunk : chunk.toString();
    
    // Verificar se já é JSON válido
    if (strChunk.trim().startsWith('{') && strChunk.trim().endsWith('}')) {
      // Se parece ser JSON, apenas passar adiante
      return originalStderrWrite.apply(process.stderr, arguments);
    } else {
      // Envolver em JSON e adicionar uma nova linha
      return originalStderrWrite.call(
        process.stderr, 
        JSON.stringify({ error: strChunk.trim() }) + '\n',
        encoding,
        callback
      );
    }
  } catch (e) {
    // Se algo der errado, pelo menos garantir que a saída seja JSON
    return originalStderrWrite.call(
      process.stderr,
      JSON.stringify({ error: "Erro ao processar erro", message: String(chunk) }) + '\n',
      encoding,
      callback
    );
  }
};

// AGORA CONTINUA O RESTO DO CÓDIGO

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
// Detectar automaticamente o ambiente Cursor
const isMCPMode = true; // FORÇAR SEMPRE MODO MCP

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
  console.log(JSON.stringify({ event: 'connection', clientId: socket.id }));
  
  socket.on('disconnect', () => {
    console.log(JSON.stringify({ event: 'disconnect', clientId: socket.id }));
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
    
    console.log(JSON.stringify({ message: `Porta ${currentPort} já está em uso, tentando próxima...` }));
    currentPort++;
    attempts++;
  }
  
  console.error(JSON.stringify({ 
    error: `Não foi possível encontrar uma porta disponível após ${MAX_PORT_ATTEMPTS} tentativas.` 
  }));
  process.exit(1);
}

// Capturar erros não tratados e enviar como JSON
process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({ 
    error: 'Erro não tratado', 
    message: err.message,
    stack: err.stack
  }));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(JSON.stringify({ 
    error: 'Promessa rejeitada não tratada', 
    message: String(reason)
  }));
});

// Iniciar o servidor com tratamento de portas
startServer();