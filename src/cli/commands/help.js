import { showHelp } from '../utils/logger.js';

export const aliases = ['help', '--help', '-h'];

export async function helpLogic(options = {}) {
  const { silent = false } = options;

  return {
    success: true,
    exitCode: 0,
    helpText: `
🧠 OmnySys CLI - Sistema Unificado

Uso: omnysys <comando>

Comandos:
  up, start     Inicia LLM + MCP + configura OpenCode
  down, stop    Detiene todos los servicios
  status        Muestra estado de los servicios
  tools         Lista herramientas disponibles
  call <tool>   Ejecuta una herramienta
  setup         Configura OpenCode y verifica instalación
  help          Muestra esta ayuda

Ejemplos:
  omnysys up                              # Inicia todo
  omnysys status                          # Ver estado
  omnysys call get_impact_map '{"filePath":"src/core.js"}'
  omnysys tools                           # Ver herramientas
`
  };
}

export async function execute() {
  const result = await helpLogic();
  console.log(result.helpText);
}
