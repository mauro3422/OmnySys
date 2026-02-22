/**
 * @fileoverview Risk Files Command - Muestra archivos de riesgo
 */

import { loadAtoms, loadSystemMap } from '../utils/data-loader.js';

export async function tool_get_risk_files() {
  console.log('\n⚠️  RISK FILES ANALYSIS');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const systemMap = await loadSystemMap();
  
  // Calcular riesgo por archivo
  const fileRisk = {};
  
  for (const atom of atoms.values()) {
    const file = atom.filePath;
    if (!file) continue;
    
    if (!fileRisk[file]) {
      fileRisk[file] = {
        atoms: 0,
        complexity: 0,
        callers: new Set(),
        highComplexity: 0
      };
    }
    
    fileRisk[file].atoms++;
    fileRisk[file].complexity += atom.complexity || 0;
    
    if (atom.complexity > 10) {
      fileRisk[file].highComplexity++;
    }
    
    if (atom.calledBy) {
      for (const caller of atom.calledBy) {
        fileRisk[file].callers.add(caller);
      }
    }
  }
  
  // Calcular score de riesgo
  const riskScores = Object.entries(fileRisk).map(([file, data]) => ({
    file,
    atoms: data.atoms,
    avgComplexity: data.complexity / data.atoms,
    callers: data.callers.size,
    highComplexity: data.highComplexity,
    riskScore: (data.callers.size * 0.5) + (data.highComplexity * 2) + (data.complexity / 10)
  }));
  
  // Ordenar por riesgo
  riskScores.sort((a, b) => b.riskScore - a.riskScore);
  
  console.log(`\n📊 TOP 20 ARCHIVOS DE MAYOR RIESGO:`);
  for (const file of riskScores.slice(0, 20)) {
    const risk = file.riskScore > 20 ? '🔴 CRITICAL' : 
                 file.riskScore > 10 ? '🟠 HIGH' : 
                 file.riskScore > 5 ? '🟡 MEDIUM' : '🟢 LOW';
    console.log(`\n   ${risk} ${file.file}`);
    console.log(`      Funciones: ${file.atoms}, Complejidad alta: ${file.highComplexity}, Callers: ${file.callers}`);
  }
  
  return riskScores;
}
