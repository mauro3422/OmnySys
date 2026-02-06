#!/usr/bin/env node

/**
 * Auditoría de Contexto Completo
 * 
 * Verifica que cada archivo analizado tenga:
 * 1. Metadatos completos (exports, imports, funciones)
 * 2. Conexiones semánticas detectadas
 * 3. Análisis LLM con reasoning
 * 4. Información de calidad de código
 * 5. Todo lo necesario para reconstruir el contexto del archivo
 */

import fs from 'fs/promises';
import path from 'path';

const REQUIRED_FIELDS = {
  // Campos básicos que deben estar presentes
  basic: [
    'id',
    'path',
    'name',
    'content',
    'exports',
    'imports',
    'dependencies',
    'dependents'
  ],
  
  // Campos de metadatos
  metadata: [
    'exportCount',
    'dependentCount',
    'importCount',
    'functionCount',
    'hasJSDoc',
    'hasAsync',
    'hasErrors'
  ],
  
  // Campos de análisis LLM
  llm: [
    'confidence',
    'reasoning',
    'analysisType'
  ],
  
  // Campos de calidad
  quality: [
    'qualityScore',
    'issues',
    'unusedExports',
    'isDeadCode'
  ],
  
  // Campos de conexiones semánticas
  semantic: [
    'localStorageKeys',
    'eventNames',
    'sharedState',
    'connections'
  ]
};

async function auditFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const audit = {
      file: path.basename(filePath),
      path: filePath,
      missingFields: [],
      presentFields: [],
      hasCompleteContext: true,
      score: 0,
      maxScore: 0
    };
    
    // Verificar campos básicos
    for (const field of REQUIRED_FIELDS.basic) {
      audit.maxScore++;
      if (data[field] !== undefined) {
        audit.presentFields.push(field);
        audit.score++;
      } else {
        audit.missingFields.push(field);
        audit.hasCompleteContext = false;
      }
    }
    
    // Verificar metadatos
    if (data.metadata) {
      for (const field of REQUIRED_FIELDS.metadata) {
        audit.maxScore++;
        if (data.metadata[field] !== undefined) {
          audit.presentFields.push(`metadata.${field}`);
          audit.score++;
        } else {
          audit.missingFields.push(`metadata.${field}`);
        }
      }
    }
    
    // Verificar análisis LLM
    if (data.llmInsights) {
      for (const field of REQUIRED_FIELDS.llm) {
        audit.maxScore++;
        if (data.llmInsights[field] !== undefined) {
          audit.presentFields.push(`llmInsights.${field}`);
          audit.score++;
        } else {
          audit.missingFields.push(`llmInsights.${field}`);
        }
      }
    }
    
    // Verificar calidad
    if (data.quality) {
      for (const field of REQUIRED_FIELDS.quality) {
        audit.maxScore++;
        if (data.quality[field] !== undefined) {
          audit.presentFields.push(`quality.${field}`);
          audit.score++;
        } else {
          audit.missingFields.push(`quality.${field}`);
        }
      }
    }
    
    // Verificar conexiones semánticas
    if (data.semantic) {
      for (const field of REQUIRED_FIELDS.semantic) {
        audit.maxScore++;
        if (data.semantic[field] !== undefined) {
          audit.presentFields.push(`semantic.${field}`);
          audit.score++;
        } else {
          audit.missingFields.push(`semantic.${field}`);
        }
      }
    }
    
    return audit;
  } catch (error) {
    return {
      file: path.basename(filePath),
      path: filePath,
      error: error.message,
      hasCompleteContext: false,
      score: 0,
      maxScore: 0
    };
  }
}

async function auditTestCase(testCasePath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Auditing: ${path.basename(testCasePath)}`);
  console.log('='.repeat(80));
  
  // Buscar archivos recursivamente en .OmnySysData/files
  const omnyDataPath = path.join(testCasePath, '.OmnySysData', 'files');
  
  try {
    const files = await fs.readdir(omnyDataPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`\n📁 Found ${jsonFiles.length} analyzed files\n`);
    
    const audits = [];
    let totalScore = 0;
    let totalMaxScore = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(omnyDataPath, file);
      const audit = await auditFile(filePath);
      audits.push(audit);
      
      totalScore += audit.score;
      totalMaxScore += audit.maxScore;
      
      // Mostrar resultado
      const percentage = ((audit.score / audit.maxScore) * 100).toFixed(1);
      const status = audit.hasCompleteContext ? '✅' : '⚠️';
      
      console.log(`${status} ${audit.file}`);
      console.log(`   Score: ${audit.score}/${audit.maxScore} (${percentage}%)`);
      
      if (audit.missingFields.length > 0) {
        console.log(`   Missing: ${audit.missingFields.join(', ')}`);
      }
      
      if (audit.error) {
        console.log(`   ❌ Error: ${audit.error}`);
      }
      
      console.log();
    }
    
    // Resumen
    const overallPercentage = ((totalScore / totalMaxScore) * 100).toFixed(1);
    const completeFiles = audits.filter(a => a.hasCompleteContext).length;
    
    console.log('📊 SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total files: ${audits.length}`);
    console.log(`Complete context: ${completeFiles}/${audits.length}`);
    console.log(`Overall score: ${totalScore}/${totalMaxScore} (${overallPercentage}%)`);
    console.log('='.repeat(80));
    
    return {
      testCase: path.basename(testCasePath),
      files: audits.length,
      completeFiles,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: parseFloat(overallPercentage)
    };
  } catch (error) {
    console.error(`❌ Error auditing ${testCasePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 CONTEXT AUDIT - Verifying Complete File Information\n');
  
  const testCases = [
    'test-cases/scenario-ia-dynamic-imports',
    'test-cases/scenario-4-localStorage-bridge',
    'test-cases/scenario-2-semantic',
    'test-cases/scenario-6-god-object',
    'test-cases/scenario-ia-orphan-effects'
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await auditTestCase(testCase);
    if (result) {
      results.push(result);
    }
  }
  
  // Resumen global
  console.log('\n\n📈 GLOBAL AUDIT SUMMARY');
  console.log('='.repeat(80));
  
  let globalScore = 0;
  let globalMax = 0;
  let totalComplete = 0;
  let totalFiles = 0;
  
  for (const result of results) {
    globalScore += result.score;
    globalMax += result.maxScore;
    totalComplete += result.completeFiles;
    totalFiles += result.files;
    
    const status = result.percentage >= 80 ? '✅' : result.percentage >= 60 ? '⚠️' : '❌';
    console.log(`${status} ${result.testCase.padEnd(40)} ${result.percentage.toFixed(1)}% (${result.completeFiles}/${result.files} complete)`);
  }
  
  const globalPercentage = ((globalScore / globalMax) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(80));
  console.log(`🎯 GLOBAL SCORE: ${globalScore}/${globalMax} (${globalPercentage}%)`);
  console.log(`📁 Files with complete context: ${totalComplete}/${totalFiles}`);
  console.log('='.repeat(80));
  
  // Recomendaciones
  console.log('\n💡 RECOMMENDATIONS:');
  if (globalPercentage < 80) {
    console.log('   ⚠️  System is NOT capturing complete context');
    console.log('   🔧 Missing fields should be added to the analysis pipeline');
  } else if (globalPercentage < 95) {
    console.log('   ⚠️  System captures most context but has gaps');
    console.log('   🔧 Review missing fields in files with low scores');
  } else {
    console.log('   ✅ System is capturing complete context correctly');
    console.log('   🎉 All necessary information is being stored');
  }
}

main().catch(console.error);
