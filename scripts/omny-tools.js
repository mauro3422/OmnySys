#!/usr/bin/env node
/**
 * @fileoverview omny-tools.js
 * 
 * Herramientas MCP offline - Lee datos de .omnysysdata/ sin iniciar el servidor.
 * 
 * @module scripts/omny-tools
 */

import {
  tool_get_server_status,
  tool_get_impact_map,
  tool_get_function_details,
  tool_get_dead_code,
  tool_get_api_surface,
  tool_get_cycles,
  tool_get_risk_files,
  tool_search_functions
} from './commands/index.js';

function printHelp() {
  console.log(`
Uso: node scripts/omny-tools.js [comando] [args]

Comandos:
  status                    # Estado del sistema
  impact <file>            # Impacto de archivo
  function <id>            # Detalles de función
  dead                     # Dead code real
  api                      # API surface
  cycles                   # Ciclos de dependencias
  risk                     # Archivos de riesgo
  search <term>            # Buscar funciones

Ejemplos:
  node scripts/omny-tools.js impact src/layer-a-static/indexer.js
  node scripts/omny-tools.js function indexProject
  node scripts/omny-tools.js search cache
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('\n🔧 OMNY-TOOLS - Herramientas MCP Offline');
  console.log('   Lee datos de .omnysysdata/ sin iniciar el servidor');
  
  switch (command) {
    case 'status':
      await tool_get_server_status();
      break;
    case 'impact':
      if (!args[1]) {
        console.log('   ❌ Falta archivo. Uso: omny-tools impact <file>');
        break;
      }
      await tool_get_impact_map(args[1]);
      break;
    case 'function':
      if (!args[1]) {
        console.log('   ❌ Falta ID. Uso: omny-tools function <id>');
        break;
      }
      await tool_get_function_details(args[1]);
      break;
    case 'dead':
      await tool_get_dead_code();
      break;
    case 'api':
      await tool_get_api_surface();
      break;
    case 'cycles':
      await tool_get_cycles();
      break;
    case 'risk':
      await tool_get_risk_files();
      break;
    case 'search':
      if (!args[1]) {
        console.log('   ❌ Falta término. Uso: omny-tools search <term>');
        break;
      }
      await tool_search_functions(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      if (command) {
        console.log(`   ❌ Comando desconocido: ${command}`);
      }
      printHelp();
      console.log('\n📊 Mostrando estado por defecto...\n');
      await tool_get_server_status();
  }
  
  console.log('\n');
}

main().catch(console.error);
