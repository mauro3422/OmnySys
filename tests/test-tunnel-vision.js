/**
 * Test standalone del Tunnel Vision Detector
 *
 * Simula modificar un archivo y verifica que se detecte tunnel vision
 */

import { detectTunnelVision, formatAlert } from './src/core/tunnel-vision-detector.js';
import { logTunnelVisionEvent, getStats, analyzePatterns } from './src/core/tunnel-vision-logger.js';

async function testTunnelVision() {
  console.log('\n🧪 Test: Tunnel Vision Detector\n');
  console.log('━'.repeat(60));

  // Test 1: Archivo con muchos dependientes
  console.log('\n📝 Test 1: Detectar tunnel vision en archivo crítico\n');

  const testFile = 'src/layer-a-static/query/index.js'; // Este archivo tiene 20 dependientes

  console.log(`Simulando modificación de: ${testFile}`);
  const alert = await detectTunnelVision(testFile);

  if (alert) {
    console.log('\n✅ TUNNEL VISION DETECTADO!\n');
    console.log(formatAlert(alert));

    // Test 2: Guardar evento
    console.log('\n📝 Test 2: Guardar evento en logger\n');
    await logTunnelVisionEvent(alert, {
      userAction: 'reviewed',
      timeToResolve: 3500,
      preventedBug: true
    });
    console.log('✅ Evento guardado en .omnysysdata/tunnel-vision-events.jsonl');

    // Test 3: Ver estadísticas
    console.log('\n📝 Test 3: Obtener estadísticas\n');
    const stats = await getStats();
    console.log('Estadísticas:', JSON.stringify(stats, null, 2));

    // Test 4: Analizar patrones
    console.log('\n📝 Test 4: Analizar patrones\n');
    const patterns = await analyzePatterns();
    console.log('Patrones:', JSON.stringify(patterns, null, 2));

  } else {
    console.log('\n❌ No se detectó tunnel vision');
    console.log('Posibles razones:');
    console.log('- El archivo no tiene dependientes');
    console.log('- Todos los dependientes fueron modificados recientemente');
    console.log('- Hay menos de 2 dependientes sin modificar');
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Test completado\n');
}

// Ejecutar test
testTunnelVision().catch(error => {
  console.error('\n❌ Error en test:', error.message);
  console.error(error.stack);
  process.exit(1);
});
