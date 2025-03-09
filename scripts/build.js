// Script de build compatível com Windows e Linux/Mac
const fs = require('fs');
const path = require('path');

// Garantir que o diretório dist existe
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.log('Criando diretório dist...');
  fs.mkdirSync(distDir, { recursive: true });
}

// Caminho para o arquivo fonte
const sourceFile = path.join(__dirname, '..', 'src', 'index.js');
// Caminho para o arquivo de destino
const destFile = path.join(distDir, 'mcp-server.js');

// Ler o conteúdo do arquivo fonte
console.log(`Lendo arquivo fonte: ${sourceFile}`);
const content = fs.readFileSync(sourceFile, 'utf8');

// Adicionar shebang no início do arquivo para torná-lo executável
const shebang = '#!/usr/bin/env node\n\n';
const modifiedContent = content.startsWith('#!/usr/bin/env node') 
  ? content 
  : shebang + content;

// Escrever o conteúdo no arquivo de destino
console.log(`Escrevendo arquivo de destino: ${destFile}`);
fs.writeFileSync(destFile, modifiedContent, 'utf8');

// No Windows, não podemos usar chmod, mas isso não é um problema
// pois o Node.js pode executar arquivos .js sem permissões especiais
if (process.platform !== 'win32') {
  console.log('Definindo permissões de execução...');
  try {
    // Tornar o arquivo executável no Linux/Mac
    const { execSync } = require('child_process');
    execSync(`chmod +x "${destFile}"`);
  } catch (error) {
    console.warn('Aviso: Não foi possível definir permissões de execução.');
    console.warn('Isso pode não ser um problema no Windows.');
  }
}

console.log('Build concluído com sucesso!');