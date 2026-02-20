/**
 * @fileoverview index.js
 * Orquestador de validación de imports
 * Coordina todos los validadores individuales
 */

import { getFileAnalysis, getProjectMetadata } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '../../../utils/logger.js';
import { findBrokenImports } from './validators/broken.js';
import { findNonExistentImports } from './validators/non-existent.js';
import { findUnusedImports } from './validators/unused.js';
import { findCircularImports } from './validators/circular.js';
import fs from 'fs/promises';

const logger = createLogger('OmnySys:validate:imports');

/**
 * Valida imports de un archivo específico
 * @param {string} filePath - Path del archivo
 * @param {Object} fileData - Datos del archivo
 * @param {string} projectPath - Path del proyecto
 * @param {Array} allFiles - Lista de todos los archivos
 * @param {string} fileContent - Contenido del archivo
 * @param {Object} options - Opciones
 * @returns {Object} Issues encontrados
 */
async function validateImportsForFile(filePath, fileData, projectPath, allFiles, fileContent, options = {}) {
  const { checkUnused = true, checkBroken = true, checkCircular = false, checkFileExistence = false } = options;
  
  const imports = fileData?.imports || [];
  const exports = fileData?.exports || [];
  const fileAtoms = fileData?.atoms || [];
  
  // Get file content for text-based checks
  let content = fileContent;
  if (!content) {
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      content = '';
    }
  }
  
  const issues = {
    broken: [],
    unused: [],
    circular: [],
    nonExistent: []
  };
  
  // Validar imports rotos o no existentes
  if (checkFileExistence) {
    issues.nonExistent = await findNonExistentImports(imports, filePath, projectPath);
  } else if (checkBroken) {
    issues.broken = await findBrokenImports(imports, filePath, projectPath, allFiles);
  }
  
  // Validar imports no usados
  if (checkUnused) {
    issues.unused = findUnusedImports(imports, fileAtoms, exports, content);
  }
  
  // Validar dependencias circulares
  if (checkCircular) {
    issues.circular = await findCircularImports(filePath, projectPath);
  }
  
  return issues;
}

/**
 * Genera sugerencias de quick fixes
 * @param {Array} files - Archivos con issues
 * @returns {Array} Quick fixes
 */
function generateQuickFixes(files) {
  const fixes = [];
  
  for (const file of files) {
    // Suggest removing unused imports
    if (file.unused?.length > 0) {
      fixes.push({
        file: file.file,
        action: 'remove_unused_imports',
        count: file.unused.length,
        imports: file.unused.map(u => u.import),
        autoFixable: true
      });
    }
    
    // Suggest fixing broken imports
    for (const broken of file.broken || []) {
      fixes.push({
        file: file.file,
        action: 'fix_broken_import',
        import: broken.import,
        line: broken.line,
        suggestions: [
          'Check if file was moved or renamed',
          'Verify import path is correct',
          'Install missing dependency'
        ],
        autoFixable: false
      });
    }
  }
  
  return fixes.slice(0, 20);
}

/**
 * Tool principal: validate_imports
 * @param {Object} args - Argumentos
 * @param {Object} context - Contexto
 * @returns {Object} Resultados
 */
export async function validate_imports(args, context) {
  const { filePath, checkUnused = true, checkBroken = true, checkCircular = false, checkFileExistence = false, excludePaths = [] } = args;
  const { projectPath } = context;
  
  logger.info(`[Tool] validate_imports("${filePath || 'all'}")`);
  
  try {
    const metadata = await getProjectMetadata(projectPath);
    const allFiles = Object.keys(metadata?.fileIndex || {});
    
    let filesToCheck = filePath ? [filePath] : allFiles;
    
    // Apply excludePaths filter
    const defaultExcludes = ['archive/', 'node_modules/', '.git/', 'dist/', 'build/', 'coverage/'];
    const allExcludes = [...defaultExcludes, ...(excludePaths || [])];
    filesToCheck = filesToCheck.filter(f => 
      !allExcludes.some(exclude => f.includes(exclude))
    );
    
    const results = {
      summary: {
        filesChecked: 0,
        filesWithIssues: 0,
        totalBroken: 0,
        totalUnused: 0,
        totalCircular: 0,
        totalNonExistent: 0
      },
      files: []
    };
    
    for (const f of filesToCheck.slice(0, 50)) {
      const fileData = await getFileAnalysis(projectPath, f);
      if (!fileData) continue;
      
      const issues = await validateImportsForFile(f, fileData, projectPath, allFiles, '', {
        checkUnused,
        checkBroken,
        checkCircular,
        checkFileExistence
      });
      
      const hasIssues = issues.broken.length > 0 || 
                       issues.unused.length > 0 || 
                       issues.circular.length > 0 ||
                       issues.nonExistent.length > 0;
      
      if (hasIssues) {
        results.files.push({
          file: f,
          broken: checkBroken ? issues.broken : [],
          unused: checkUnused ? issues.unused : [],
          circular: checkCircular ? issues.circular : [],
          nonExistent: checkFileExistence ? issues.nonExistent : [],
          summary: {
            brokenCount: issues.broken.length,
            unusedCount: issues.unused.length,
            circularCount: issues.circular.length,
            nonExistentCount: issues.nonExistent.length
          }
        });
        
        results.summary.filesWithIssues++;
        results.summary.totalBroken += issues.broken.length;
        results.summary.totalUnused += issues.unused.length;
        results.summary.totalCircular += issues.circular.length;
        results.summary.totalNonExistent += issues.nonExistent.length;
      }
      
      results.summary.filesChecked++;
    }
    
    // Sort by severity
    results.files.sort((a, b) => {
      const scoreA = (a.broken?.length || 0) * 100 + (a.circular?.length || 0) * 10 + (a.unused?.length || 0);
      const scoreB = (b.broken?.length || 0) * 100 + (b.circular?.length || 0) * 10 + (b.unused?.length || 0);
      return scoreB - scoreA;
    });
    
    // Generate fix suggestions
    results.quickFixes = generateQuickFixes(results.files);
    
    return results;
  } catch (error) {
    logger.error(`[Tool] validate_imports failed: ${error.message}`);
    return { error: error.message };
  }
}

// Re-exportar para uso externo
export { checkImportExists } from './utils/file-utils.js';
export { resolveImportPath } from './resolvers/path-resolver.js';
export { getImportSuggestion } from './utils/suggestions.js';
