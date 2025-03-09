import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

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
  console.log('Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar o servidor
server.listen(PORT, () => {
  console.log(`Servidor MCP rodando em http://localhost:${PORT}`);
  console.log('Aguardando conexões...');
});