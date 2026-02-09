/**
 * Test del Detector de Race Conditions en Proyecto Real
 * 
 * Analiza el proyecto OmnySystem para detectar races
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { extractAllMetadata } from './src/layer-a-static/extractors/metadata/index.js';
import { extractMolecularStructure, analyzeProjectSystem, detectRaceConditions } from './src/layer-a-static/pipeline/molecular-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Archivos a analizar
const TEST_FILES = [
  './src/layer-a-static/pipeline/molecular-extractor.js',
  './src/core/file-watcher/analyze.js',
  './src/layer-a-static/module-system/index.js'
];

async function analyzeFile(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  
  try {
    const code = await fs.readFile(fullPath, 'utf-8');
    const parsed = await parseFileFromDisk(fullPath);
    
    if (!parsed || !parsed.functions || parsed.functions.length === 0) {
      return null;
    }
    
    const metadata = extractAllMetadata(filePath, code);
    const molecular = await extractMolecularStructure(filePath, code, parsed, metadata);
    
    return molecular;
  } catch (error) {
    console.warn(`Warning: Could not analyze ${filePath}: ${error.message}`);
    return null;
  }
}

async function testRaceDetectionOnRealProject() {
  console.log('🧪 Testing Race Condition Detector on Real Project\n');
  console.log('=' .repeat(60));
  
  try {
    // Analizar todos los archivos
    console.log('\n📁 Analyzing files...');
    const molecules = [];
    
    for (const file of TEST_FILES) {
      const molecule = await analyzeFile(file);
      if (molecule) {
        molecules.push(molecule);
        console.log(`  ✅ ${file} - ${molecule.atoms.length} atoms`);
      } else {
        console.log(`  ⚠️  ${file} - no atoms found`);
      }
    }
    
    if (molecules.length === 0) {
      console.log('\n❌ No molecules to analyze');
      return;
    }
    
    // Fase 3: Analizar sistema
    console.log('\n🔍 Phase 3: System Analysis...');
    const projectRoot = __dirname;
    const systemData = await analyzeProjectSystem(projectRoot, molecules);
    
    console.log(`  Modules: ${systemData.summary.totalModules}`);
    console.log(`  Business Flows: ${systemData.summary.totalBusinessFlows}`);
    
    // Fase 4: Detectar races
    console.log('\n🚨 Phase 4: Race Condition Detection...');
    const projectData = {
      modules: systemData.modules,
      system: systemData.system,
      molecules: systemData.molecules
    };
    
    const enrichedData = await detectRaceConditions(projectData);
    const raceResults = enrichedData.raceConditions;
    
    // Mostrar resultados
    console.log('\n' + '='.repeat(60));
    console.log('📊 RACE DETECTION RESULTS\n');
    
    console.log(`Total Races: ${raceResults.summary.totalRaces}`);
    console.log(`Total Warnings: ${raceResults.summary.totalWarnings}`);
    console.log(`Shared State Items: ${raceResults.summary.sharedStateItems}`);
    
    if (raceResults.summary.totalRaces > 0) {
      console.log('\n📈 By Severity:');
      for (const [severity, count] of Object.entries(raceResults.summary.bySeverity)) {
        const icon = severity === 'critical' ? '🔴' : 
                     severity === 'high' ? '🟠' : 
                     severity === 'medium' ? '🟡' : '🟢';
        console.log(`  ${icon} ${severity}: ${count}`);
      }
      
      console.log('\n📈 By Type:');
      for (const [type, count] of Object.entries(raceResults.summary.byType)) {
        console.log(`  ${type}: ${count}`);
      }
      
      console.log('\n🚨 Detected Races:\n');
      raceResults.races.forEach((race, index) => {
        console.log(`${index + 1}. ${race.type} - ${race.severity.toUpperCase()}`);
        console.log(`   State: ${race.stateKey}`);
        console.log(`   ${race.description}`);
        
        if (race.pattern) {
          console.log(`   Pattern: ${race.patternName || race.pattern}`);
        }
        
        console.log('   Functions:');
        race.accesses.forEach(access => {
          console.log(`     • ${access.atomName} (${access.module})`);
          console.log(`       └─ ${access.type} at line ${access.line}`);
        });
        
        if (race.hasMitigation) {
          console.log(`   ✅ Mitigation: ${race.mitigationType}`);
        }
        
        console.log('');
      });
    } else {
      console.log('\n✅ No race conditions detected!');
    }
    
    console.log('='.repeat(60));
    console.log('✅ Analysis completed successfully!');
    
    // Guardar reporte
    const reportPath = path.join(__dirname, 'race-detection-report.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify(raceResults, null, 2)
    );
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testRaceDetectionOnRealProject();
