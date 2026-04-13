import { getRepository } from '../../storage/repository/repository-factory.js';
import {
  buildFolderizationNamingPlanFromRows,
  loadFolderizationRows
} from '../../../shared/compiler/index.js';
import { buildNamingDebtPropagationPlan } from '../../../shared/compiler/propagation-engine/change-type-plans/naming-debt.js';

/**
 * @fileoverview Advanced impact simulator for naming debt changes.
 * Uses real DB data (imports, exports, semantic connections) to predict breakage.
 * 
 * @module mcp/tools/naming-debt-impact-simulator
 */

function normalizePath(path) {
  if (!path) return null;
  return path.replace(/\\/g, '/').toLowerCase();
}

/**
 * Collects real import/export dependencies from the database
 */
function collectRealDependencies(repo, renameTargets) {
  try {
    const targetPaths = new Set(renameTargets.map(t => normalizePath(t?.from)).filter(Boolean));
    
    // Query all files that import from the targets
    const importQuery = `
      SELECT DISTINCT 
        sf.relative_path as importer,
        sc.source_path as imported_from,
        sc.target_path as import_target,
        sc.import_type
      FROM semantic_connections sc
      JOIN system_files sf ON sc.source_file_id = sf.id
      WHERE sc.connection_type IN ('import', 'require', 'dynamic_import')
        AND LOWER(sc.target_path) IN (${targetPaths.size > 0 ? Array.from(targetPaths).map(() => '?').join(',') : "''"})
    `;
    
    const importRows = repo.db.prepare(importQuery).all(
      targetPaths.size > 0 ? Array.from(targetPaths) : ['']
    );

    // Query all files that are imported by targets
    const exportQuery = `
      SELECT DISTINCT
        sf.relative_path as exporter,
        sc.source_path,
        sc.target_path,
        COUNT(DISTINCT sf2.id) as imported_by_count
      FROM semantic_connections sc
      JOIN system_files sf ON sc.target_file_id = sf.id
      LEFT JOIN system_files sf2 ON sc.source_file_id = sf2.id
      WHERE sc.connection_type IN ('import', 'require', 'export')
        AND LOWER(sc.source_path) IN (${targetPaths.size > 0 ? Array.from(targetPaths).map(() => '?').join(',') : "''"})
      GROUP BY sf.relative_path
    `;
    
    const exportRows = repo.db.prepare(exportQuery).all(
      targetPaths.size > 0 ? Array.from(targetPaths) : ['']
    );

    return {
      imports: importRows || [],
      exports: exportRows || []
    };
  } catch (error) {
    // Fallback to atom-based query if semantic_connections fails
    return collectDependenciesFromAtoms(repo, renameTargets);
  }
}

/**
 * Fallback: collect dependencies from atoms table
 */
function collectDependenciesFromAtoms(repo, renameTargets) {
  try {
    const targetPaths = new Set(renameTargets.map(t => normalizePath(t?.from)).filter(Boolean));
    
    const atomQuery = `
      SELECT DISTINCT
        a.file_path,
        a.name,
        a.type,
        a.imports_json,
        a.exports_json
      FROM atoms a
      WHERE a.type IN ('import', 'require', 'export')
        OR (a.imports_json IS NOT NULL AND a.imports_json != '[]')
        OR (a.exports_json IS NOT NULL AND a.exports_json != '[]')
    `;
    
    const atoms = repo.db.prepare(atomQuery).all();
    const impactedFiles = [];

    for (const atom of atoms) {
      const imports = atom.imports_json ? JSON.parse(atom.imports_json) : [];
      const exports = atom.exports_json ? JSON.parse(atom.exports_json) : [];
      
      const brokenImports = [];
      
      // Check if this file imports any of the targets
      for (const imp of imports) {
        const importPath = normalizePath(imp.path || imp.source || imp.target || '');
        if (targetPaths.has(importPath)) {
          brokenImports.push({
            type: 'import',
            path: imp.path || imp.source || imp.target,
            wouldBreak: true
          });
        }
      }

      if (brokenImports.length > 0) {
        impactedFiles.push({
          filePath: atom.file_path,
          brokenImports,
          importCount: brokenImports.length,
          severity: brokenImports.length > 3 ? 'high' : 'medium'
        });
      }
    }

    return {
      imports: impactedFiles,
      exports: []
    };
  } catch (error) {
    return { imports: [], exports: [] };
  }
}

/**
 * Validates if files actually exist on disk
 */
function validateFileExistence(projectPath, targets) {
  const fs = require('fs');
  const path = require('path');
  
  return targets.map(target => {
    const fullPath = path.join(projectPath, target.from);
    const exists = fs.existsSync(fullPath);
    return {
      ...target,
      exists,
      fullPath,
      warning: exists ? null : `⚠️ File does not exist: ${fullPath}`
    };
  });
}

/**
 * Checks for circular dependencies that would be affected
 */
function checkCircularImpact(repo, renameTargets) {
  try {
    const targetPaths = new Set(renameTargets.map(t => normalizePath(t?.from)).filter(Boolean));
    
    const circularQuery = `
      SELECT DISTINCT
        a1.file_path as file1,
        a2.file_path as file2,
        a1.name as func1,
        a2.name as func2
      FROM atoms a1
      JOIN atoms a2 ON a1.file_path != a2.file_path
      WHERE a1.type = 'function'
        AND a2.type = 'function'
        AND (
          (LOWER(a1.file_path) IN (${Array.from(targetPaths).map(() => '?').join(',')}))
          OR
          (LOWER(a2.file_path) IN (${Array.from(targetPaths).map(() => '?').join(',')}))
        )
      LIMIT 50
    `;
    
    const affected = repo.db.prepare(circularQuery).all(
      ...Array.from(targetPaths),
      ...Array.from(targetPaths)
    );

    return {
      hasCircularRisk: affected.length > 0,
      affectedFunctions: affected.slice(0, 20)
    };
  } catch (error) {
    return { hasCircularRisk: false, affectedFunctions: [] };
  }
}

/**
 * Builds comprehensive impact report with real DB data
 */
function buildComprehensiveImpactReport(namingPlan, dependencies, validation, circularRisk, propagationPlan) {
  const allImpactedFiles = new Map();

  // Process imports
  for (const imp of dependencies.imports) {
    const filePath = imp.filePath || imp.importer;
    if (!filePath) continue;

    if (!allImpactedFiles.has(filePath)) {
      allImpactedFiles.set(filePath, {
        filePath,
        brokenImports: [],
        brokenExports: [],
        importCount: 0,
        exportCount: 0,
        severity: 'low',
        riskFactors: []
      });
    }

    const entry = allImpactedFiles.get(filePath);
    entry.brokenImports.push(...(imp.brokenImports || [{ path: imp.import_target }]));
    entry.importCount = entry.brokenImports.length;
    
    if (entry.importCount > 5) entry.severity = 'critical';
    else if (entry.importCount > 3) entry.severity = 'high';
    else if (entry.importCount > 1) entry.severity = 'medium';
  }

  // Process exports
  for (const exp of dependencies.exports) {
    const filePath = exp.exporter;
    if (!filePath) continue;

    if (!allImpactedFiles.has(filePath)) {
      allImpactedFiles.set(filePath, {
        filePath,
        brokenImports: [],
        brokenExports: [],
        importCount: 0,
        exportCount: 0,
        severity: 'low',
        riskFactors: []
      });
    }

    const entry = allImpactedFiles.get(filePath);
    entry.exportCount = exp.imported_by_count || 0;
    entry.riskFactors.push(`Exported by ${entry.exportCount} files`);
  }

  // Add validation warnings
  for (const target of validation) {
    if (!target.exists) {
      if (allImpactedFiles.has(target.from)) {
        allImpactedFiles.get(target.from).riskFactors.push(target.warning);
      }
    }
  }

  // Add circular dependency risks
  if (circularRisk.hasCircularRisk) {
    for (const func of circularRisk.affectedFunctions) {
      const filePath = func.file1;
      if (allImpactedFiles.has(filePath)) {
        allImpactedFiles.get(filePath).riskFactors.push(
          `⚠️ Circular dependency risk with ${func.func2} in ${func.file2}`
        );
      }
    }
  }

  const impactedFilesArray = Array.from(allImpactedFiles.values())
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    })
    .slice(0, 50); // Top 50 most impacted

  const totalBrokenImports = impactedFilesArray.reduce((sum, f) => sum + f.importCount, 0);
  const totalBrokenExports = impactedFilesArray.reduce((sum, f) => sum + f.exportCount, 0);
  const criticalFiles = impactedFilesArray.filter(f => f.severity === 'critical' || f.severity === 'high');

  return {
    success: true,
    mode: 'impact_simulation',
    timestamp: new Date().toISOString(),
    summary: {
      totalRenames: namingPlan.renameTargets?.length || 0,
      impactedFiles: impactedFilesArray.length,
      brokenImports: totalBrokenImports,
      brokenExports: totalBrokenExports,
      criticalFiles: criticalFiles.length,
      circularDependencyRisk: circularRisk.hasCircularRisk,
      missingFiles: validation.filter(v => !v.exists).length,
      overallRisk: calculateOverallRisk(impactedFilesArray, circularRisk, validation)
    },
    renameTargets: namingPlan.renameTargets || [],
    impact: {
      criticalFiles: criticalFiles.slice(0, 10),
      highSeverityFiles: impactedFilesArray.filter(f => f.severity === 'high').slice(0, 20),
      mediumSeverityFiles: impactedFilesArray.filter(f => f.severity === 'medium').slice(0, 20),
      totalImpactedFiles: impactedFilesArray.length
    },
    validation: {
      missingFiles: validation.filter(v => !v.exists),
      warnings: validation.filter(v => v.warning).map(v => v.warning)
    },
    circularDependencies: circularRisk,
    propagation: {
      changeType: propagationPlan.changeType,
      decision: propagationPlan.decision,
      connectedSystems: propagationPlan.connectedSystems,
      systemsCount: propagationPlan.connectedSystems?.length || 0,
      guidance: propagationPlan.guidance
    },
    recommendations: generateRecommendations(impactedFilesArray, circularRisk, validation),
    canSafelyProceed: canSafelyProceed(impactedFilesArray, circularRisk, validation)
  };
}

function calculateOverallRisk(impactedFiles, circularRisk, validation) {
  let score = 0;
  const reasons = [];

  // File impact score
  if (impactedFiles.length > 20) {
    score += 40;
    reasons.push(`High file impact: ${impactedFiles.length} files`);
  } else if (impactedFiles.length > 10) {
    score += 25;
    reasons.push(`Medium file impact: ${impactedFiles.length} files`);
  } else if (impactedFiles.length > 0) {
    score += 10;
    reasons.push(`Low file impact: ${impactedFiles.length} files`);
  }

  // Broken imports/exports
  const totalBroken = impactedFiles.reduce((sum, f) => sum + f.importCount + f.exportCount, 0);
  if (totalBroken > 50) {
    score += 30;
    reasons.push(`High break risk: ${totalBroken} dependencies`);
  } else if (totalBroken > 20) {
    score += 20;
    reasons.push(`Medium break risk: ${totalBroken} dependencies`);
  } else if (totalBroken > 0) {
    score += 5;
    reasons.push(`Low break risk: ${totalBroken} dependencies`);
  }

  // Circular dependencies
  if (circularRisk.hasCircularRisk) {
    score += 20;
    reasons.push('Circular dependency risk detected');
  }

  // Missing files
  const missingCount = validation.filter(v => !v.exists).length;
  if (missingCount > 0) {
    score += 10;
    reasons.push(`${missingCount} files missing on disk`);
  }

  return {
    score: Math.min(score, 100),
    level: score > 70 ? 'critical' : score > 50 ? 'high' : score > 30 ? 'medium' : 'low',
    reasons
  };
}

function generateRecommendations(impactedFiles, circularRisk, validation) {
  const recommendations = [];

  if (impactedFiles.length > 20) {
    recommendations.push('⚠️ HIGH IMPACT: Consider breaking this into smaller batches');
  }

  if (circularRisk.hasCircularRisk) {
    recommendations.push('🔄 CIRCULAR DEPENDENCY: Review circular dependencies before proceeding');
  }

  const missingFiles = validation.filter(v => !v.exists);
  if (missingFiles.length > 0) {
    recommendations.push(`❌ MISSING FILES: ${missingFiles.length} files don't exist on disk`);
  }

  const criticalFiles = impactedFiles.filter(f => f.severity === 'critical');
  if (criticalFiles.length > 0) {
    recommendations.push(`🔴 CRITICAL: ${criticalFiles.length} files with 5+ broken imports`);
    recommendations.push('💡 TIP: Use fix_imports tool after renaming to auto-repair');
  }

  if (impactedFiles.length > 0) {
    recommendations.push('✅ SAFE MODE: Run with execute=false first to preview changes');
    recommendations.push('🔍 VALIDATION: Use validate_imports after renaming');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ LOW RISK: No significant issues detected, safe to proceed');
  }

  return recommendations;
}

function canSafelyProceed(impactedFiles, circularRisk, validation) {
  const criticalFiles = impactedFiles.filter(f => f.severity === 'critical');
  const missingFiles = validation.filter(v => !v.exists);

  return {
    safe: criticalFiles.length === 0 && !circularRisk.hasCircularRisk && missingFiles.length === 0,
    blockers: [
      ...(criticalFiles.length > 0 ? [`${criticalFiles.length} critical files`] : []),
      ...(circularRisk.hasCircularRisk ? ['Circular dependency risk'] : []),
      ...(missingFiles.length > 0 ? [`${missingFiles.length} missing files`] : [])
    ],
    warnings: impactedFiles.filter(f => f.severity === 'high').map(f => f.filePath)
  };
}

export async function simulate_naming_debt_impact(candidatePath, projectPath) {
  try {
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return {
        success: false,
        error: 'Repository not available',
        recommendation: 'Ensure OmnySys server is running and project is indexed'
      };
    }

    // Step 1: Get naming plan
    const rows = loadFolderizationRows(repo);
    const namingPlan = buildFolderizationNamingPlanFromRows(rows, [candidatePath]);

    if (!namingPlan || (namingPlan.renameTargets || []).length === 0) {
      return {
        success: true,
        mode: 'noop',
        message: 'No rename targets found for the selected folderized family',
        recommendation: 'This family may not have naming debt or is already normalized'
      };
    }

    // Step 2: Validate files exist
    const validatedTargets = validateFileExistence(projectPath, namingPlan.renameTargets || []);

    // Step 3: Collect real dependencies
    const dependencies = collectRealDependencies(repo, namingPlan.renameTargets || []);

    // Step 4: Check circular dependencies
    const circularRisk = checkCircularImpact(repo, namingPlan.renameTargets || []);

    // Step 5: Build propagation plan
    const propagationPlan = buildNamingDebtPropagationPlan({
      namingDebtCount: namingPlan.renameTargets?.length || 0,
      impactedFileCount: dependencies.imports.length + dependencies.exports.length,
      focusPath: candidatePath,
      topImpactedFiles: dependencies.imports.slice(0, 10)
    });

    // Step 6: Build comprehensive report
    const report = buildComprehensiveImpactReport(
      namingPlan,
      dependencies,
      validatedTargets,
      circularRisk,
      propagationPlan
    );

    return report;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      recommendation: 'Check server logs for detailed error information'
    };
  }
}

export default { simulate_naming_debt_impact };
