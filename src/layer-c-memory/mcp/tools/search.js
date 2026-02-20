/**
 * Tool: search_files
 * Search for files by pattern, content, or similar code
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { getAllAtoms } from '#layer-c/storage/index.js';
import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
import fs from 'fs/promises';
import { glob } from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:search');

/**
 * Check if a pattern is a glob pattern
 */
function isGlobPattern(pattern) {
  return pattern.includes('*') || pattern.includes('?') || pattern.includes('[');
}

/**
 * Search files by path/name using glob or substring matching
 */
async function searchByPath(pattern, allFiles, projectPath) {
  // If it's a glob pattern, use actual glob matching
  if (isGlobPattern(pattern)) {
    try {
      const globResults = [];
      for await (const file of glob(pattern, { cwd: projectPath, absolute: true })) {
        globResults.push(file);
      }
      return globResults;
    } catch (err) {
      logger.warn(`[search] Glob pattern failed, falling back to substring: ${err.message}`);
    }
  }
  
  // Fallback to substring matching
  const lowerPattern = pattern.toLowerCase();
  return allFiles.filter(f => f.toLowerCase().includes(lowerPattern));
}

/**
 * Search symbols (functions, classes) by name
 */
async function searchBySymbol(pattern, atoms, excludeFiles) {
  const lowerPattern = pattern.toLowerCase();
  const symbolFileHits = new Map();
  
  for (const atom of atoms) {
    if (excludeFiles.has(atom.filePath)) continue;
    
    const name = (atom.name || '').toLowerCase();
    const fingerprint = (atom.dna?.semanticFingerprint || '').toLowerCase();
    
    if (name.includes(lowerPattern) || fingerprint.includes(lowerPattern)) {
      if (!symbolFileHits.has(atom.filePath)) symbolFileHits.set(atom.filePath, []);
      symbolFileHits.get(atom.filePath).push({
        name: atom.name,
        type: atom.type,
        line: atom.line
      });
    }
  }
  
  return Array.from(symbolFileHits.entries()).map(([path, symbols]) => ({
    path,
    symbols: symbols.slice(0, 5)
  }));
}

/**
 * Search files by code content
 */
async function searchByContent(pattern, projectPath, allFiles) {
  const lowerPattern = pattern.toLowerCase();
  const contentMatches = [];
  
  for (const file of allFiles.slice(0, 100)) { // Limit for performance
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes(lowerPattern)) {
        // Find line number
        const lines = content.split('\n');
        const lineNumbers = [];
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lowerPattern)) {
            lineNumbers.push(i + 1);
            if (lineNumbers.length >= 3) break;
          }
        }
        
        contentMatches.push({
          path: file,
          lineNumbers,
          preview: lines[lineNumbers[0] - 1]?.trim().substring(0, 80) || ''
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }
  
  return contentMatches;
}

/**
 * Find similar code using DNA pattern hash
 */
async function findSimilarCode(codeSnippet, atoms) {
  // Simple approach: find atoms with similar structure
  const snippetLower = codeSnippet.toLowerCase().trim();
  
  const similarAtoms = atoms
    .filter(atom => {
      // Check if atom name or pattern is similar
      const atomName = (atom.name || '').toLowerCase();
      const operations = (atom.dna?.operationSequence || []).join(' ').toLowerCase();
      
      // Simple similarity: check if any words from snippet appear
      const snippetWords = snippetLower.split(/\s+/);
      return snippetWords.some(word => 
        word.length > 3 && (atomName.includes(word) || operations.includes(word))
      );
    })
    .slice(0, 10)
    .map(atom => ({
      id: atom.id,
      name: atom.name,
      file: atom.filePath,
      line: atom.line,
      complexity: atom.complexity,
      similarity: 'medium'
    }));
  
  return similarAtoms;
}

export async function search_files(args, context) {
  const { pattern, searchType = 'auto', codeSnippet } = args;
  const { projectPath, server } = context;
  
  logger.info(`[Tool] search_files("${pattern}", type: ${searchType})`);

  try {
    const metadata = await getProjectMetadata(projectPath);
    const fileIndex = metadata?.fileIndex || metadata?.files || {};
    const allFiles = Object.keys(fileIndex);
    
    // If code snippet provided, find similar code
    if (codeSnippet) {
      const atoms = await getAllAtoms(projectPath);
      const similar = await findSimilarCode(codeSnippet, atoms);
      
      return {
        type: 'similar_code',
        snippet: codeSnippet.substring(0, 100),
        found: similar.length,
        matches: similar,
        note: 'Found similar patterns based on DNA analysis'
      };
    }

    // Auto-detect search type based on pattern
    const looksLikeCode = pattern.includes(' ') || pattern.includes('{');
    const looksLikeSymbol = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(pattern); // single identifier
    const detectedType = searchType === 'auto'
      ? (looksLikeCode ? 'content' : 'path')
      : searchType;

    const lowerPattern = pattern.toLowerCase();
    let pathMatches = [];
    let symbolMatches = [];
    let contentMatches = [];

    // Path search
    if (detectedType === 'path' || detectedType === 'auto') {
      pathMatches = await searchByPath(pattern, allFiles, projectPath);
    }

    // Symbol search — always run for 'symbol', also run for 'path' when pattern is a pure identifier
    if (detectedType === 'symbol' || detectedType === 'auto' || (detectedType === 'path' && looksLikeSymbol)) {
      const atoms = await getAllAtoms(projectPath);
      const matchedFiles = new Set(pathMatches);
      symbolMatches = await searchBySymbol(pattern, atoms, matchedFiles);
    }

    // Content search (slower, only when explicitly requested or pattern looks like code)
    if (detectedType === 'content') {
      contentMatches = await searchByContent(pattern, projectPath, allFiles);
    }

    const allMatchPaths = new Set([
      ...pathMatches, 
      ...symbolMatches.map(m => m.path),
      ...contentMatches.map(m => m.path)
    ]);

    return {
      pattern,
      searchType: detectedType,
      found: allMatchPaths.size,
      files: pathMatches.slice(0, 20),
      symbolFiles: symbolMatches.slice(0, 10),
      contentMatches: contentMatches.slice(0, 10),
      byType: {
        pathMatches: pathMatches.length,
        symbolMatches: symbolMatches.length,
        contentMatches: contentMatches.length
      },
      totalIndexed: allFiles.length
    };
  } catch (error) {
    logger.error(`[Tool] search_files failed: ${error.message}`);
    return {
      pattern,
      found: 0,
      files: [],
      error: error.message,
      note: 'Server may still be initializing'
    };
  }
}
