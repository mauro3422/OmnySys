#!/usr/bin/env node

/**
 * @fileoverview validate-full.js
 * 
 * CLI para el Meta-Validator de OmnySys.
 * Valida todos los aspectos del análisis:
 * - Source: Datos extraídos vs código fuente
 * - Derivation: Derivaciones fractales
 * - Semantic: Data flow
 * - Cross-metadata: Combinaciones
 * 
 * Uso:
 *   node scripts/validate-full.js [project-path]
 *   node scripts/validate-full.js ./my-project --auto-fix
 *   node scripts/validate-full.js --layer source
 * 
 * @module scripts/validate-full
 */

import { ValidationEngine, getGlobalRegistry, ValidationSeverity } from '../src/validation/index.js';
import { registerInvariants } from '../src/validation/invariants/system-invariants.js';
import { 
  FileExistenceRule,
  ExportConsistencyRule, 
  ImportResolutionRule 
} from '../src/validation/rules/source/index.js';
import { 
  ComplexityCalculationRule,
  RiskCalculationRule 
} from '../src/validation/rules/derivation/index.js';
import { ExportUsageRule } from '../src/validation/rules/semantic/index.js';
import { createLogger } from '../src/utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

const logger = createLogger('OmnySys:validate-full');

/**
 * Parsea argumentos de CLI
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    projectPath: process.cwd(),
    omnysysPath: null,
    layer: null,
    autoFix: false,
    json: false,
    save: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
        
      case '--layer':
        options.layer = args[++i];
        break;
        
      case '--auto-fix':
      case '-f':
        options.autoFix = true;
        break;
        
      case '--json':
      case '-j':
        options.json = true;
        break;
        
      case '--save':
      case '-s':
        options.save = true;
        break;
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--omnysys-path':
        options.omnysysPath = args[++i];
        break;
        
      default:
        if (!arg.startsWith('-')) {
          options.projectPath = path.resolve(arg);
        }
    }
  }
  
  // Default omnysys path
  if (!options.omnysysPath) {
    options.omnysysPath = path.join(options.projectPath, '.omnysysdata');
  }
  
  return options;
}

/**
 * Imprime ayuda
 */
function printHelp() {
  console.log(`
OmnySys Full Validator - Meta-Validation System

USAGE:
  node scripts/validate-full.js [project-path] [options]

ARGUMENTS:
  project-path          Path to project to validate (default: current directory)

OPTIONS:
  -h, --help           Show this help
  -f, --auto-fix       Automatically fix issues when possible
  -j, --json           Output JSON instead of human-readable
  -s, --save           Save report to .omnysysdata/validation-report.json
  -v, --verbose        Verbose output
  --layer <layer>      Validate only specific layer (source|derivation|semantic|cross-metadata)
  --omnysys-path <path> Custom path to .omnysysdata

EXAMPLES:
  # Validate current directory
  node scripts/validate-full.js

  # Validate specific project with auto-fix
  node scripts/validate-full.js ./my-project --auto-fix

  # Validate only source layer and output JSON
  node scripts/validate-full.js --layer source --json

  # Save report to file
  node scripts/validate-full.js --save

EXIT CODES:
  0  All validations passed
  1  Some validations failed
  2  Critical invariant violations (system corrupt)
`);
}

/**
 * Registra todas las reglas built-in
 */
function registerBuiltinRules(registry) {
  // Invariantes del sistema
  registerInvariants(registry);
  
  // Source rules (Ground Truth)
  registry.register(FileExistenceRule);
  registry.register(ExportConsistencyRule);
  registry.register(ImportResolutionRule);
  
  // Derivation rules (Fractal)
  registry.register(ComplexityCalculationRule);
  registry.register(RiskCalculationRule);
  
  // Semantic rules
  registry.register(ExportUsageRule);
  
  return registry;
}

/**
 * Formatea resultados para CLI
 */
function formatForCLI(report, verbose) {
  const lines = [];
  
  lines.push('');
  lines.push('╔' + '═'.repeat(68) + '╗');
  lines.push('║' + ' '.repeat(15) + 'OMNYSYS VALIDATION REPORT' + ' '.repeat(26) + '║');
  lines.push('╚' + '═'.repeat(68) + '╝');
  lines.push('');
  
  // Info del proyecto
  lines.push(`📁 Project: ${report.projectPath}`);
  lines.push(`⏱️  Duration: ${report.duration}ms`);
  lines.push('');
  
  // Resumen con colores (emojis en lugar de colores para compatibilidad)
  lines.push('📊 SUMMARY:');
  lines.push(`   ✅ Passed:   ${report.stats.passed}`);
  lines.push(`   ⚠️  Warnings: ${report.stats.warnings}`);
  lines.push(`   ❌ Failed:   ${report.stats.failed}`);
  lines.push(`   🚨 Critical: ${report.stats.critical}`);
  if (report.stats.fixed > 0) {
    lines.push(`   🛠️  Fixed:    ${report.stats.fixed}`);
  }
  lines.push('');
  
  // Estado general
  if (report.hasCriticalViolations) {
    lines.push('🚨 STATUS: CRITICAL VIOLATIONS DETECTED');
    lines.push('   The system integrity is compromised. Immediate action required.');
  } else if (report.stats.failed > 0) {
    lines.push('⚠️  STATUS: VALIDATION FAILED');
    lines.push('   Some validations did not pass. Review the issues below.');
  } else if (report.stats.warnings > 0) {
    lines.push('✅ STATUS: PASSED WITH WARNINGS');
    lines.push('   All critical checks passed, but there are warnings.');
  } else {
    lines.push('✅ STATUS: ALL VALIDATIONS PASSED');
    lines.push('   The system is healthy and consistent.');
  }
  lines.push('');
  
  // Invariantes violadas
  if (report.invariantViolations.length > 0) {
    lines.push('🚨 CRITICAL INVARIANT VIOLATIONS:');
    report.invariantViolations.forEach((v, i) => {
      lines.push(`   ${i + 1}. [${v.rule}] ${v.entity}`);
      lines.push(`      ${v.message}`);
      if (verbose && v.details) {
        lines.push(`      Details: ${JSON.stringify(v.details, null, 2).replace(/\n/g, '\n      ')}`);
      }
    });
    lines.push('');
  }
  
  // Entidades stale
  if (report.staleEntities.length > 0) {
    lines.push('🔄 STALE ENTITIES (need re-analysis):');
    report.staleEntities.forEach((e, i) => {
      lines.push(`   ${i + 1}. ${e.entity}`);
      lines.push(`      Reason: ${e.reason}`);
    });
    lines.push('');
  }
  
  // Fallos detallados (si verbose)
  if (verbose) {
    const failures = report.results.filter(r => !r.valid && r.severity !== ValidationSeverity.CRITICAL);
    if (failures.length > 0) {
      lines.push('❌ DETAILED FAILURES:');
      failures.forEach((f, i) => {
        lines.push(`   ${i + 1}. [${f.layer}] ${f.entity}${f.field ? '.' + f.field : ''}`);
        lines.push(`      ${f.message}`);
        if (f.expected !== undefined && f.actual !== undefined) {
          lines.push(`      Expected: ${JSON.stringify(f.expected)}`);
          lines.push(`      Actual:   ${JSON.stringify(f.actual)}`);
        }
        if (f.fixApplied) {
          lines.push(`      🛠️  Fixed: ${JSON.stringify(f.fixedValue)}`);
        }
      });
      lines.push('');
    }
  }
  
  // Resultados por capa
  lines.push('📋 RESULTS BY LAYER:');
  for (const [layer, data] of Object.entries(report.layers)) {
    if (data.results.length > 0) {
      const passRate = Math.round((data.stats.passed / data.results.length) * 100);
      lines.push(`   ${layer}: ${data.stats.passed}/${data.results.length} (${passRate}%)`);
    }
  }
  lines.push('');
  
  lines.push('═'.repeat(70));
  
  return lines.join('\n');
}

/**
 * Guarda reporte a archivo
 */
async function saveReport(report, omnysysPath) {
  const reportPath = path.join(omnysysPath, 'validation-report.json');
  
  try {
    await fs.mkdir(omnysysPath, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report.toJSON(), null, 2));
    return reportPath;
  } catch (error) {
    logger.error(`Failed to save report: ${error.message}`);
    return null;
  }
}

/**
 * Main
 */
async function main() {
  const options = parseArgs();
  
  logger.info('='.repeat(70));
  logger.info('OMNYSYS FULL VALIDATOR');
  logger.info('='.repeat(70));
  logger.info(`Project: ${options.projectPath}`);
  logger.info(`Omnysys: ${options.omnysysPath}`);
  logger.info(`Options: autoFix=${options.autoFix}, layer=${options.layer || 'all'}`);
  
  // Verificar que exista .omnysysdata
  try {
    await fs.access(options.omnysysPath);
  } catch {
    console.error(`\n❌ Error: No analysis data found at ${options.omnysysPath}`);
    console.error('   Please run analysis first: npm run analyze');
    process.exit(1);
  }
  
  // Crear engine y registrar reglas
  const registry = getGlobalRegistry();
  registerBuiltinRules(registry);
  
  const engineOptions = {
    autoFix: options.autoFix,
    parallel: true,
    stopOnCritical: true
  };
  
  if (options.layer) {
    // Si especificaron capa, solo validar esa
    // TODO: Implementar validación por capa
    logger.info(`Validating layer: ${options.layer}`);
  }
  
  const engine = new ValidationEngine(engineOptions);
  
  // Ejecutar validación
  let report;
  try {
    report = await engine.validate(options.projectPath, options.omnysysPath);
  } catch (error) {
    console.error(`\n❌ Validation failed with error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(2);
  }
  
  // Output
  if (options.json) {
    console.log(JSON.stringify(report.toJSON(), null, 2));
  } else {
    console.log(formatForCLI(report, options.verbose));
  }
  
  // Guardar si se pidió
  if (options.save) {
    const savedPath = await saveReport(report, options.omnysysPath);
    if (savedPath) {
      console.log(`\n💾 Report saved to: ${savedPath}`);
    }
  }
  
  // Exit code
  if (report.hasCriticalViolations) {
    process.exit(2);
  } else if (!report.allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(2);
});
