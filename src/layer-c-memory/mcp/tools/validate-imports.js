/**
 * MCP Tool: validate_imports
 * Valida imports de un archivo: que existan, no estén rotos, y se usen
 */

import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';
import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { getAllAtoms } from '#layer-c/storage/index.js';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:validate:imports');

/**
 * Sugiere alternativas para un import que no existe
 */
function getImportSuggestion(importSource, attemptedPaths) {
  // Sugerencias comunes basadas en patrones
  const suggestions = [];
  
  // Si es un import de #utils, sugerir alternativas comunes
  if (importSource.startsWith('#utils/')) {
    suggestions.push('Use "fs/promises" para operaciones de archivo nativas de Node.js');
    suggestions.push('Verificar si existe en src/utils/ con otro nombre');
  }
  
  // Si termina en .js, sugerir probar sin extensión o con /index.js
  if (importSource.endsWith('.js')) {
    const withoutExt = importSource.slice(0, -3);
    suggestions.push(`Try "${withoutExt}" or "${withoutExt}/index.js"`);
  }
  
  // Si es un módulo interno, verificar typos
  const parts = importSource.split('/');
  if (parts.length > 1) {
    suggestions.push(`Verificar que "${parts[parts.length - 1]}" exista en ${parts.slice(0, -1).join('/')}`);
  }
  
  return suggestions.length > 0 ? suggestions[0] : 'Verificar el path del import';
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveImportPath(importSource, currentFile, projectPath) {
  const currentDir = path.dirname(currentFile);
  
  // Relative imports
  if (importSource.startsWith('./') || importSource.startsWith('../')) {
    const resolved = path.resolve(currentDir, importSource);
    // Try with and without extension
    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
    return extensions.map(ext => resolved + ext);
  }
  
  // Path aliases (e.g., #core/*, #layer-c/*)
  if (importSource.startsWith('#')) {
    // Map aliases to actual paths based on project structure
    const aliasMap = {
      '#core': 'src/core',
      '#layer-a': 'src/layer-a-static',
      '#layer-b': 'src/layer-b-semantic',
      '#layer-c': 'src/layer-c-memory',
      '#layer-graph': 'src/layer-graph',
      '#ai': 'src/ai',
      '#services': 'src/services',
      '#utils': 'src/utils',
      '#config': 'src/config',
      '#shared': 'src/shared',
      '#cli': 'src/cli'
    };
    
    for (const [alias, realPath] of Object.entries(aliasMap)) {
      if (importSource.startsWith(alias)) {
        const relativePath = importSource.slice(alias.length + 1); // +1 for /
        return [path.join(projectPath, realPath, relativePath + '.js')];
      }
    }
  }
  
  // Node modules (assume they exist)
  if (!importSource.startsWith('.')) {
    return ['node_module'];
  }
  
  return [importSource];
}

/**
 * Verifica si un módulo importado realmente existe en el sistema de archivos
 * @param {string} importSource - El path del import (ej: "#utils/file-reader.js")
 * @param {string} currentFile - Archivo que hace el import
 * @param {string} projectPath - Path del proyecto
 * @returns {Promise<{exists: boolean, resolvedPath: string|null, attemptedPaths: string[]}>}
 */
export async function checkImportExists(importSource, currentFile, projectPath) {
  const possiblePaths = resolveImportPath(importSource, currentFile, projectPath);
  const attemptedPaths = [];
  
  for (const p of possiblePaths) {
    if (p === 'node_module') {
      return { exists: true, resolvedPath: importSource, attemptedPaths: [importSource] };
    }
    
    attemptedPaths.push(p);
    
    // Verificar existencia real en disco
    if (await fileExists(p)) {
      return { exists: true, resolvedPath: p, attemptedPaths };
    }
    
    // También probar con /index.js o /index.ts si es un directorio
    const indexPaths = [`${p}/index.js`, `${p}/index.ts`];
    for (const indexPath of indexPaths) {
      attemptedPaths.push(indexPath);
      if (await fileExists(indexPath)) {
        return { exists: true, resolvedPath: indexPath, attemptedPaths };
      }
    }
  }
  
  return { exists: false, resolvedPath: null, attemptedPaths };
}

async function validateImportsForFile(filePath, fileData, projectPath, allFiles, fileContent, options = {}) {
  const { checkFileExistence = false } = options;
  const issues = {
    broken: [],
    unused: [],
    missing: [],
    circular: [],
    nonExistent: [] // Nuevo: imports que no existen en el filesystem
  };
  
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
  
    // Check each import
  for (const imp of imports) {
    const source = imp.source || imp.module;
    if (!source) continue;
    
    // Skip node_modules for now
    if (!source.startsWith('.') && !source.startsWith('#')) {
      continue;
    }
    
    // Check if import resolves
    let found = false;
    let resolvedPath = null;
    let attemptedPaths = [];
    
    if (checkFileExistence) {
      // Validación estricta: verificar existencia real en filesystem
      const checkResult = await checkImportExists(source, filePath, projectPath);
      found = checkResult.exists;
      resolvedPath = checkResult.resolvedPath;
      attemptedPaths = checkResult.attemptedPaths;
      
      if (!found) {
        issues.nonExistent.push({
          import: source,
          line: imp.line,
          reason: 'Module does not exist in filesystem',
          attemptedPaths: attemptedPaths.slice(0, 5),
          suggestion: getImportSuggestion(source, attemptedPaths)
        });
        continue;
      }
    } else {
      // Validación básica: solo verificar que el path se pueda resolver
      const possiblePaths = resolveImportPath(source, filePath, projectPath);
      attemptedPaths = possiblePaths;
      
      for (const p of possiblePaths) {
        if (p === 'node_module') {
          found = true;
          break;
        }
        if (await fileExists(p) || allFiles.some(f => f === p || f.replace(/\\/g, '/') === p.replace(/\\/g, '/'))) {
          found = true;
          resolvedPath = p;
          break;
        }
      }
      
      if (!found) {
        issues.broken.push({
          import: source,
          line: imp.line,
          reason: 'Cannot resolve import path',
          attemptedPaths: possiblePaths.slice(0, 3)
        });
        continue;
      }
    }
    
    // Check if imported symbols are used
    const importedNames = imp.specifiers?.map(s => s.local) || [];
    for (const name of importedNames) {
      // Check if used in file atoms
      const isUsedInAtoms = fileAtoms.some(atom => {
        // Check calls
        if (atom.calls?.some(c => c.name === name || c.callee === name)) return true;
        // Check data flow
        if (atom.dataFlow?.transformations?.some(t => 
          t.from?.includes(name) || t.to === name
        )) return true;
        // Check if passed to other functions
        if (atom.calls?.some(c => c.arguments?.some(arg => arg === name))) return true;
        return false;
      });
      
      // Check if it's re-exported directly
      const isReExported = exports.some(e => e.name === name);
      
      // Check if used in export values (e.g., export const toolHandlers = { search_files })
      const isUsedInExports = exports.some(e => {
        // Check if the export value references this import
        const exportValue = JSON.stringify(e);
        return exportValue.includes(name);
      });
      
      // Check if used in source code text (for object literals, shorthand properties, spread operators)
      const isUsedInSourceCode = content && (
        // Shorthand property usage: { get_impact_map }
        new RegExp(`{[^}]*\\b${name}\\b[^}]*}`).test(content) ||
        // Spread operator usage: ...PAGINATION_SCHEMA
        content.includes(`...${name}`) ||
        // Object property usage: { name: get_impact_map }
        new RegExp(`:\\s*${name}\\b`).test(content) ||
        // Array literal usage: [get_impact_map]
        new RegExp(`\\[.*\\b${name}\\b.*\\]`).test(content)
      );
      
      if (!isUsedInAtoms && !isReExported && !isUsedInExports && !isUsedInSourceCode && name !== '*') {
        issues.unused.push({
          import: name,
          source: source,
          line: imp.line,
          reason: 'Imported but never used'
        });
      }
    }
  }
  
  // Check for circular dependencies
  const dependents = await getFileDependents(projectPath, filePath);
  for (const dep of dependents) {
    const depData = await getFileAnalysis(projectPath, dep);
    if (depData?.imports?.some(i => {
      const src = i.source || i.module;
      return src && (src.includes(filePath) || filePath.includes(src));
    })) {
      issues.circular.push({
        file: dep,
        type: 'import-cycle',
        severity: 'medium'
      });
    }
  }
  
  return issues;
}

/**
 * Tool principal
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
        totalCircular: 0
      },
      files: []
    };
    
    for (const f of filesToCheck.slice(0, 50)) { // Limit for performance
      const fileData = await getFileAnalysis(projectPath, f);
      if (!fileData) continue;
      
      // Read file content for text-based validation
      let fileContent = '';
      try {
        fileContent = await fs.readFile(path.join(projectPath, f), 'utf-8');
      } catch {
        // Skip if can't read
      }
      
      const issues = await validateImportsForFile(f, fileData, projectPath, allFiles, fileContent, { checkFileExistence });
      
      const hasIssues = issues.broken.length > 0 || 
                       issues.unused.length > 0 || 
                       issues.circular.length > 0 ||
                       issues.nonExistent?.length > 0;
      
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
            nonExistentCount: issues.nonExistent?.length || 0
          }
        });
        
        results.summary.filesWithIssues++;
        results.summary.totalBroken += issues.broken.length;
        results.summary.totalUnused += issues.unused.length;
        results.summary.totalCircular += issues.circular.length;
        results.summary.totalNonExistent = (results.summary.totalNonExistent || 0) + (issues.nonExistent?.length || 0);
      }
      
      results.summary.filesChecked++;
    }
    
    // Sort by severity (broken first)
    results.files.sort((a, b) => {
      const scoreA = a.broken.length * 100 + a.circular.length * 10 + a.unused.length;
      const scoreB = b.broken.length * 100 + b.circular.length * 10 + b.unused.length;
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

function generateQuickFixes(files) {
  const fixes = [];
  
  for (const file of files) {
    // Suggest removing unused imports
    if (file.unused.length > 0) {
      fixes.push({
        file: file.file,
        action: 'remove_unused_imports',
        count: file.unused.length,
        imports: file.unused.map(u => u.import),
        autoFixable: true
      });
    }
    
    // Suggest fixing broken imports
    for (const broken of file.broken) {
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
