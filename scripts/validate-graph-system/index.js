/**
 * @fileoverview index.js - Orchestration for validate-graph-system
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAuditData } from './loader.js';
import { analyzePurposeCoverage, getPurposeDistribution } from './purpose-analyzer.js';
import { analyzeConnections } from './connection-analyzer.js';
import { 
  printValidationHeader, 
  printPurposeStats, 
  printDistribution, 
  printConnectionStats 
} from './reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..', '..');

async function validate() {
  printValidationHeader();
  
  const { atoms, systemMap } = await loadAuditData(ROOT_PATH);
  console.log(`   ✅ Átomos cargados: ${atoms.size}`);
  console.log(`   ✅ System Map: ${systemMap ? 'Disponible' : 'No disponible'}`);

  const { withPurpose } = analyzePurposeCoverage(atoms);
  printPurposeStats(withPurpose, atoms.size);
  
  const distribution = getPurposeDistribution(withPurpose);
  printDistribution(distribution);

  const links = analyzeConnections(atoms, withPurpose);
  printConnectionStats(links);
  
  console.log('\n✅ VALIDACIÓN COMPLETADA\n');
}

validate().catch(console.error);
