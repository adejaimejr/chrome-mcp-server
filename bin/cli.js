#!/usr/bin/env node

// Este é o ponto de entrada para o comando CLI
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho para o arquivo principal
const serverPath = join(__dirname, '..', 'src', 'index.js');

// Verificar se estamos sendo executados pelo Cursor MCP
const isMCPMode = process.argv.includes('--mcp') || 
                  process.env.MCP_MODE === 'true' || 
                  process.argv[1].includes('cursor');

// Se estiver em modo MCP, não exibir mensagens de log
if (!isMCPMode) {
  console.log('Iniciando Chrome MCP Server...');
  console.log(`Servidor: ${serverPath}`);
}

// Configurar opções para o processo filho
const spawnOptions = {
  stdio: isMCPMode ? ['ignore', 'pipe', 'ignore'] : 'inherit',
  shell: true
};

// Executar o servidor
const server = spawn('node', [serverPath, isMCPMode ? '--mcp' : ''], spawnOptions);

// Se estiver em modo MCP, capturar a saída e filtrar logs
if (isMCPMode) {
  // Capturar apenas a saída JSON
  server.stdout.on('data', (data) => {
    const output = data.toString();
    // Verificar se a saída parece ser JSON
    if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
      process.stdout.write(data);
    }
  });
}

// Lidar com o encerramento do processo
process.on('SIGINT', () => {
  if (!isMCPMode) {
    console.log('Encerrando servidor...');
  }
  server.kill('SIGINT');
  process.exit(0);
});

server.on('close', (code) => {
  if (!isMCPMode) {
    console.log(`Servidor encerrado com código: ${code}`);
  }
  process.exit(code);
});