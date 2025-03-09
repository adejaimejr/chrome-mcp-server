#!/usr/bin/env node

// Este é o ponto de entrada para o comando CLI
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho para o arquivo principal
const serverPath = join(__dirname, '..', 'src', 'index.js');

console.log('Iniciando Chrome MCP Server...');
console.log(`Servidor: ${serverPath}`);

// Executar o servidor
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  shell: true
});

// Lidar com o encerramento do processo
process.on('SIGINT', () => {
  console.log('Encerrando servidor...');
  server.kill('SIGINT');
  process.exit(0);
});

server.on('close', (code) => {
  console.log(`Servidor encerrado com código: ${code}`);
  process.exit(code);
});