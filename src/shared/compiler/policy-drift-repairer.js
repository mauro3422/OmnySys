/**
 * @fileoverview Policy Drift Repairer
 *
 * Executes repair plans and orchestrates the consolidation process.
 *
 * @module shared/compiler/policy-drift-repairer
 */

import { readFileSync } from 'fs';
import {
  detectPolicyDriftsBatch,
  detectPolicyDriftsInDirectory
} from './policy-drift-scanner.js';
import { FIX_TEMPLATES } from './policy-drift-templates.js';

// ── Plan Generation ────────────────────────────────────────────────

/**
 * Genera un repair plan para un finding específico
 * @param {Object} finding - Finding de conformance
 * @param {string} finding.filePath
 * @param {string} finding.source
 * @param {string} finding.issueType
 * @returns {Object|null} Repair plan o null si no hay fix automático
 */
export function generateRepairPlan(finding) {
  const template = FIX_TEMPLATES[finding.issueType];
  if (!template) {
    return null; // No hay fix automático para este tipo
  }

  try {
    const fix = template.generateFix ? template.generateFix(finding, finding.source) : null;
    return {
      filePath: finding.filePath,
      driftType: finding.issueType,
      fixType: template.fixType,
      autoFixable: template.autoFixable || false,
      requiresHumanAttention: template.requiresHumanAttention || false,
      humanAttentionReason: template.humanAttentionReason || null,
      description: template.description,
      severity: finding.severity || 'medium',
      policyArea: finding.policyArea,
      fix,
      estimatedImpact: {
        linesAdded: template.fixType === 'add_import' ? 1 : 0,
        linesChanged: template.fixType === 'add_import' ? 0 : 5,
        riskLevel: template.fixType === 'add_import' ? 'low' : 'medium'
      }
    };
  } catch (error) {
    return null;
  }
}

/**
 * Genera repair plans para múltiples findings
 * @param {Array} findings - Lista de findings
 * @returns {Array} Lista de repair plans
 */
export function generateRepairPlansBatch(findings) {
  return findings
    .map(f => generateRepairPlan(f))
    .filter(Boolean);
}

// ── Plan Execution ─────────────────────────────────────────────────

/**
 * Aplica un repair plan a un archivo
 * @param {Object} plan - Repair plan
 * @param {string} plan.filePath
 * @param {Object} plan.fix
 * @param {string} plan.fix.addImport
 * @returns {Object} Resultado de la ejecución
 */
export async function executeRepairPlan(plan) {
  const { filePath, fix } = plan;

  try {
    let source = readFileSync(filePath, 'utf-8');

    // Verificar si el import ya existe
    if (fix.importedNames) {
      const allPresent = fix.importedNames.every(name => {
        const importRegex = new RegExp(`import\\s+.*\\b${name}\\b.*from`);
        return importRegex.test(source);
      });

      if (allPresent) {
        return {
          success: true,
          filePath,
          action: 'skipped',
          reason: 'All required imports already present'
        };
      }
    }

    // Agregar import después del último import existente
    const importRegex = /^import\s+.*from\s+['"][^'"]+['"]\s*;?$/gm;
    const imports = source.match(importRegex) || [];
    const lastImport = imports[imports.length - 1];

    if (lastImport) {
      const lastImportIndex = source.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      source = source.slice(0, insertPosition) + '\n' + fix.addImport + source.slice(insertPosition);
    } else {
      // Si no hay imports, agregar al inicio
      source = fix.addImport + '\n\n' + source;
    }

    return {
      success: true,
      filePath,
      action: 'applied',
      newSource: source,
      importAdded: fix.addImport
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      action: 'failed',
      error: error.message
    };
  }
}

// ── High-Level API ─────────────────────────────────────────────────

/**
 * Detecta y repara policy drifts en archivos
 * @param {Object} options
 * @param {Array<string>} [options.filePaths] - Archivos específicos a escanear
 * @param {string} [options.scopePath] - Directorio a escanear
 * @param {string} [options.policyArea] - Filtrar por área de política
 * @param {boolean} [options.execute=false] - Si true, aplica los repairs
 * @returns {Object} Resultado del análisis/repair
 */
export async function consolidatePolicyDrifts(options = {}) {
  const {
    filePaths = [],
    scopePath = null,
    policyArea = null,
    execute = false
  } = options;

  // 1. Detectar drifts
  const findings = filePaths.length > 0
    ? detectPolicyDriftsBatch(filePaths)
    : scopePath
      ? detectPolicyDriftsInDirectory(scopePath)
      : [];

  // 2. Filtrar por policy area si se especificó
  const filteredFindings = policyArea
    ? findings.filter(f => f.policyArea === policyArea)
    : findings;

  // 3. Generar repair plans
  const repairPlans = generateRepairPlansBatch(filteredFindings);

  // 4. Si execute=true, aplicar los repairs
  const executionResults = [];
  if (execute && repairPlans.length > 0) {
    for (const plan of repairPlans) {
      const result = await executeRepairPlan(plan);
      executionResults.push(result);
    }
  }

  return {
    success: true,
    mode: execute ? 'execute' : 'preview',
    summary: {
      totalFindings: filteredFindings.length,
      totalRepairPlans: repairPlans.length,
      autoFixable: repairPlans.filter(p => p.autoFixable).length,
      requiresHumanAttention: repairPlans.filter(p => p.requiresHumanAttention).length,
      executed: execute ? executionResults.filter(r => r.success).length : 0,
      skipped: execute ? executionResults.filter(r => r.action === 'skipped').length : 0,
      failed: execute ? executionResults.filter(r => !r.success).length : 0
    },
    autoFixablePlans: repairPlans.filter(p => p.autoFixable).map(p => ({
      filePath: p.filePath,
      driftType: p.driftType,
      fixType: p.fixType,
      description: p.description,
      importToAdd: p.fix?.addImport
    })),
    requiresHumanAttentionPlans: repairPlans.filter(p => p.requiresHumanAttention).map(p => ({
      filePath: p.filePath,
      driftType: p.driftType,
      fixType: p.fixType,
      description: p.description,
      humanAttentionReason: p.humanAttentionReason,
      recommendedAction: p.recommendedAction
    })),
    findings: filteredFindings.map(f => ({
      filePath: f.filePath,
      issueType: f.issueType,
      severity: f.severity,
      policyArea: f.policyArea,
      message: f.message
    })),
    repairPlans: repairPlans.map(p => ({
      filePath: p.filePath,
      driftType: p.driftType,
      fixType: p.fixType,
      autoFixable: p.autoFixable,
      requiresHumanAttention: p.requiresHumanAttention,
      description: p.description,
      importToAdd: p.fix?.addImport
    })),
    executionResults: execute ? executionResults : []
  };
}
