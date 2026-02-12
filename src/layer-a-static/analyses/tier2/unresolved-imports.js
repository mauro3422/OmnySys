import fs from 'fs/promises';
import path from 'path';

/**
 * Detecta si hay imports con subpath imports (#) no resueltos
 * y verifica si hay configuración en package.json
 * 
 * @param {string} projectRoot - Raíz del proyecto
 * @param {Array} unresolvedImports - Lista de imports no resueltos
 * @returns {Promise<object>} - Información sobre configuración faltante
 */
async function detectMissingSubpathConfig(projectRoot, unresolvedImports) {
  // Buscar imports que usan # (subpath imports)
  const subpathImports = [];
  
  for (const [filePath, imports] of Object.entries(unresolvedImports || {})) {
    for (const imp of imports) {
      if (imp.source?.startsWith('#')) {
        subpathImports.push({
          file: filePath,
          import: imp.source,
          type: 'subpath'
        });
      }
    }
  }
  
  if (subpathImports.length === 0) {
    return null;
  }
  
  // Verificar si hay package.json con imports configurados
  try {
    const packagePath = path.join(projectRoot, 'package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    
    if (pkg.imports) {
      // Hay configuración, pero no se está usando correctamente
      return {
        hasConfig: true,
        configuredAliases: Object.keys(pkg.imports),
        unresolvedSubpathImports: subpathImports,
        issue: 'Resolver not reading package.json imports',
        suggestion: 'Check resolver.js configuration'
      };
    }
  } catch {
    // No hay package.json o no tiene imports
  }
  
  return {
    hasConfig: false,
    unresolvedSubpathImports: subpathImports,
    issue: 'Missing package.json imports configuration',
    suggestion: 'Add "imports" section to package.json'
  };
}

/**
 * Unresolved Imports Analyzer
 *
 * Responsabilidad:
 * - Encontrar imports que no se resolvieron (rotos)
 * - Filtrar módulos externos legítimos (Node.js, npm packages)
 * - Detectar falsos positivos (imports con aliases pero sin configuración)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {Promise<object>} - Reporte de imports sin resolver
 */
export async function findUnresolvedImports(systemMap, projectRoot) {
  const unresolvedByFile = {};
  let realIssues = 0;

  // Filtrar solo los imports que son realmente problemáticos
  // Excluir módulos externos (Node.js, npm) - NO son issues
  for (const [filePath, imports] of Object.entries(systemMap.unresolvedImports || {})) {
    const problematicImports = imports.filter(imp => {
      // EXCLUIR imports externos (node_modules) - son legítimos, no errores
      if (imp.type === 'external') return false;
      
      // Solo incluir si severity es HIGH (verdadero problema)
      return imp.severity === 'HIGH';
    });

    if (problematicImports.length > 0) {
      unresolvedByFile[filePath] = problematicImports;
      realIssues += problematicImports.length;
    }
  }

  // Detectar configuración de subpath imports faltante
  const subpathConfig = projectRoot ? 
    await detectMissingSubpathConfig(projectRoot, systemMap.unresolvedImports || {}) : 
    null;

  // Generar recomendación inteligente
  let recommendation;
  if (realIssues === 0) {
    recommendation = 'All imports resolved';
  } else if (subpathConfig?.hasConfig) {
    recommendation = `Found ${realIssues} unresolved imports including ${subpathConfig.unresolvedSubpathImports.length} subpath imports (#). ` +
      `Configuration exists in package.json but resolver may not be reading it. ` +
      `Configured aliases: ${subpathConfig.configuredAliases.join(', ')}`;
  } else if (subpathConfig?.unresolvedSubpathImports?.length > 0) {
    recommendation = `Found ${realIssues} unresolved imports including ${subpathConfig.unresolvedSubpathImports.length} subpath imports (#). ` +
      `Consider adding "imports" section to package.json`;
  } else {
    recommendation = `Fix ${realIssues} unresolved import(s) - they may break at runtime`;
  }

  return {
    total: realIssues,
    byFile: unresolvedByFile,
    subpathConfig,
    recommendation
  };
}
