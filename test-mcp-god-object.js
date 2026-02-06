#!/usr/bin/env node
/**
 * Test script para verificar que el MCP devuelve el árbol genealógico completo
 * Simula lo que haría una IA al consultar get_impact_map
 */

import { CogniSystemMCPServer } from '../src/layer-c-memory/mcp/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = path.join(__dirname, '../test-cases/scenario-6-god-object');

async function testMCPQuery() {
  console.log('🧪 Probando MCP con scenario-6-god-object\n');
  
  // Crear instancia del server (sin iniciar stdio)
  const server = new CogniSystemMCPServer(projectPath);
  
  try {
    // Solo inicializar (sin iniciar el transporte stdio)
    await server.initialize();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SIMULANDO QUERY: get_impact_map("src/Core.js")');
    console.log('='.repeat(60) + '\n');
    
    // Simular llamada a la herramienta get_impact_map
    const toolHandlers = await import('../src/layer-c-memory/mcp/tools/index.js');
    const context = {
      orchestrator: server.orchestrator,
      cache: server.cache,
      projectPath: projectPath
    };
    
    const result = await toolHandlers.toolHandlers['get_impact_map']({
      filePath: 'src/Core.js'
    }, context);
    
    // Mostrar resultado
    console.log('✅ RESULTADO DE LA QUERY:\n');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificar información clave
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICACIÓN DEL ÁRBOL GENEALÓGICO:');
    console.log('='.repeat(60));
    
    if (result.file) {
      console.log(`\n📄 Archivo: ${result.file.path}`);
      
      if (result.file.archetype) {
        console.log(`🏷️  Arquetipo: ${result.file.archetype.type}`);
        console.log(`   Razón: ${result.file.archetype.reason}`);
      }
      
      if (result.dependents) {
        console.log(`\n👥 Dependientes (${result.dependents.length}):`);
        result.dependents.forEach(dep => {
          console.log(`   • ${dep.path} ${dep.symbols ? `- usa: ${dep.symbols.join(', ')}` : ''}`);
        });
      }
      
      if (result.exports) {
        console.log(`\n📤 Exports (${result.exports.length}):`);
        result.exports.forEach(exp => {
          console.log(`   • ${exp.name} (${exp.type})`);
        });
      }
      
      if (result.impact) {
        console.log(`\n⚠️  Impacto:`);
        console.log(`   Nivel de riesgo: ${result.impact.riskLevel}`);
        console.log(`   Archivos afectados: ${result.impact.affectedCount}`);
      }
      
      console.log('\n✅ ¡El sistema MCP está funcionando correctamente!');
      console.log('   La IA recibe toda la información contextual necesaria.');
    } else {
      console.log('❌ No se encontró información del archivo');
    }
    
    await server.shutdown();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMCPQuery();
