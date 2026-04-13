import { getRepository } from '../../storage/repository/repository-factory.js';
import {
  buildFolderizationNamingPlanFromRows,
  loadFolderizationRows
} from '../../../shared/compiler/index.js';
import { buildNamingDebtPropagationPlan } from '../../../shared/compiler/propagation-engine/change-type-plans/naming-debt.js';

/**
 * @fileoverview Impact simulator for naming debt changes.
 * Shows what would break before applying rename_folderized_family.
 * 
 * @module mcp/tools/naming-debt-impact-simulator
 */

function normalizeSnapshotPath(path) {
  if (!path) return null;
  return path.replace(/\\/g, '/');
}

function collectRenameImpact(rows = [], renameTargets = []) {
  const targetSet = new Set(renameTargets.map(target => normalizeSnapshotPath(target?.from)).filter(Boolean));
  const impactedFiles = [];
  const brokenImports = [];

  for (const row of rows) {
    const rowPath = normalizeSnapshotPath(row.path || row.filePath || '');
    if (!rowPath || targetSet.has(rowPath)) {
      continue;
    }

    const imports = Array.isArray(row.imports) ? row.imports : [];
    const exports = Array.isArray(row.exports) ? row.exports : [];
    const allDependencies = [...imports, ...exports];

    for (const dep of allDependencies) {
      const depPath = normalizeSnapshotPath(dep?.resolved || dep?.target || dep?.source || dep?.path || dep?.filePath || '');
      if (targetSet.has(depPath)) {
        brokenImports.push({
          file: rowPath,
          imports: depPath,
          wouldBreak: true
        });

        const existing = impactedFiles.find(f => f.filePath === rowPath);
        if (existing) {
          existing.importCount++;
          existing.brokenImports.push(depPath);
        } else {
          impactedFiles.push({
            filePath: rowPath,
            importCount: 1,
            brokenImports: [depPath],
            severity: 'high'
          });
        }
      }
    }
  }

  impactedFiles.sort((a, b) => b.importCount - a.importCount);

  return {
    impactedFileCount: impactedFiles.length,
    impactedFiles,
    brokenImportCount: brokenImports.length,
    rewriteCount: impactedFiles.reduce((sum, item) => sum + item.importCount, 0),
    severity: impactedFiles.length > 10 ? 'high' : impactedFiles.length > 5 ? 'medium' : 'low'
  };
}

function buildImpactReport(namingPlan, impact, propagationPlan) {
  return {
    success: true,
    mode: 'impact_simulation',
    summary: {
      totalRenames: namingPlan.renameTargets?.length || 0,
      impactedFiles: impact.impactedFileCount,
      brokenImports: impact.brokenImportCount,
      severity: impact.severity,
      wouldBreak: impact.brokenImportCount > 0
    },
    renameTargets: namingPlan.renameTargets || [],
    impact: {
      severity: impact.severity,
      impactedFiles: impact.impactedFiles.slice(0, 20),
      brokenImportCount: impact.brokenImportCount
    },
    propagation: {
      changeType: propagationPlan.changeType,
      decision: propagationPlan.decision,
      connectedSystems: propagationPlan.connectedSystems,
      guidance: propagationPlan.guidance
    },
    recommendation: impact.brokenImportCount > 0
      ? `⚠️ HIGH RISK: ${impact.brokenImportCount} imports would break across ${impact.impactedFileCount} files. Review dependencies before executing.`
      : '✅ LOW RISK: No broken imports detected. Safe to proceed with rename.',
    wouldBreak: impact.brokenImportCount > 0
  };
}

export async function simulateNaming_debt_impact(candidatePath, projectPath) {
  try {
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return {
        success: false,
        error: 'Repository not available'
      };
    }

    const rows = loadFolderizationRows(repo);
    const namingPlan = buildFolderizationNamingPlanFromRows(rows, [candidatePath]);

    if (!namingPlan || (namingPlan.renameTargets || []).length === 0) {
      return {
        success: true,
        mode: 'noop',
        message: 'No rename targets found for the selected folderized family'
      };
    }

    const impact = collectRenameImpact(rows, namingPlan.renameTargets || []);
    
    const propagationPlan = buildNamingDebtPropagationPlan({
      namingDebtCount: namingPlan.renameTargets?.length || 0,
      impactedFileCount: impact.impactedFileCount,
      focusPath: candidatePath,
      topImpactedFiles: impact.impactedFiles.slice(0, 10)
    });

    const report = buildImpactReport(namingPlan, impact, propagationPlan);

    return report;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

export default { simulateNaming_debt_impact };
