import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = 'C:\\Dev\\OmnySystem';
const serverPath = path.join(projectPath, 'src', 'core', 'unified-server', 'index.js');

console.log('🚀 Iniciando servidor OmnySys v0.6.0...');
console.log('📁 Proyecto:', projectPath);

const server = spawn('node', [serverPath, projectPath], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

server.on('close', (code) => {
  console.log(`Servidor terminó con código ${code}`);
});

// Desvincular para que siga corriendo
server.unref();

console.log('✅ Servidor iniciado en background');
console.log('🌐 Puerto:', 9999);
console.log('📊 API: http://localhost:9999/api/status');

setTimeout(() => {
  process.exit(0);
}, 2000);
