/**
 * @fileoverview atom-extractor.js
 *
 * Atom extraction logic for individual and batch atom processing
 *
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor
 */

import { extractFunctionCode } from '../../../../../shared/utils/line-utils.js';
import { calculateComplexity } from '../metadata/complexity.js';
import { detectAtomArchetype } from '../metadata/archetype.js';
import { detectAtomPurpose } from '../metadata/purpose.js';
import { buildAtomMetadata } from '../builders/metadata-builder.js';
import { enrichWithDNA } from '../builders/enrichment.js';
import { buildVariableAtom } from './atom-extractor/variable-atom-builder.js';
import { runAtomExtractors } from './atom-extractor/extractor-runner.js';
import { extractDataFlowSafe } from './atom-extractor/data-flow-helper.js';

import { semanticAnalyzer } from '#core/analysis/semantic-analyzer/index.js';

function getAtomSourceCode(code, atomInfo) {
  if (atomInfo.type === 'function' || atomInfo.type === 'method') {
    return extractFunctionCode(code, atomInfo);
  }

  const startIndex = (atomInfo.lineStart || 1) - 1;
  const endIndex = atomInfo.lineEnd || atomInfo.lineStart || 1;

  return code.split('\n').slice(startIndex, endIndex).join('\n');
}

function getAtomLineStart(atom) {
  return atom.lineStart || atom.line || 0;
}

function getAtomLineEnd(atom) {
  return atom.lineEnd || atom.endLine || 0;
}

function findBestSqlParent(atoms, sqlLine) {
  let bestParent = null;
  let bestSize = Infinity;

  for (const candidate of atoms) {
    if (candidate.type === 'sql_query') continue;

    const cStart = getAtomLineStart(candidate);
    const cEnd = getAtomLineEnd(candidate);

    if (cStart <= sqlLine && cEnd >= sqlLine) {
      const size = cEnd - cStart;
      if (size < bestSize) {
        bestSize = size;
        bestParent = candidate;
      }
    }
  }

  return bestParent;
}

function linkSqlAtoms(atoms, extractionDepth) {
  const sqlAtoms = atoms.filter(def => def.type === 'sql_query');

  for (const sqlAtom of sqlAtoms) {
    const sqlLine = sqlAtom.lineStart || (sqlAtom._meta && sqlAtom._meta.line_start) || 0;
    if (sqlLine > 0) {
      const bestParent = findBestSqlParent(atoms, sqlLine);

      if (bestParent && sqlAtom._meta) {
        sqlAtom._meta.parent_atom_id = bestParent.id || null;
        sqlAtom._meta.parent_atom_name = bestParent.name || null;
      }
    }

    sqlAtom.isPhase2Complete = extractionDepth !== 'structural';
  }
}

/**
 * Extract metadata for all atoms from file info
 * @param {Object} fileInfo - Parsed file info with atoms
 * @param {string} code - Source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @param {string} extractionDepth - Depth of extraction: 'structural' or 'deep'
 * @returns {Promise<Array>} - Array of atom metadata
 */
export async function extractAtoms(fileInfo, code, fileMetadata, filePath, extractionDepth = 'deep') {
  const atoms = [];
  const fileImports = fileInfo.imports || [];

  const baseAtoms = await Promise.all(
    (fileInfo.atoms || []).map(async (atomInfo) => {
      try {
        const atomCode = getAtomSourceCode(code, atomInfo);
        const metadata = await extractAtomMetadata(atomInfo, atomCode, fileMetadata, filePath, fileImports, code, extractionDepth);
        return metadata;
      } catch (err) {
        return null;
      }
    })
  );

  atoms.push(...baseAtoms.filter(a => a !== null));
  linkSqlAtoms(atoms, extractionDepth);

  return atoms;
}

/**
 * Extract metadata for a single atom
 * @param {Object} functionInfo - Function info from parser
 * @param {string} functionCode - Extracted function source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @param {string} filePath - File path
 * @param {Array} imports - File-level imports
 * @param {string} fullFileCode - Full file source code
 * @param {string} extractionDepth - 'structural' or 'deep'
 * @returns {Promise<Object>} - Atom metadata
 */
export async function extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath, imports = [], fullFileCode = null, extractionDepth = 'deep') {
  const isStructural = extractionDepth === 'structural';

  const extractorResults = isStructural ? {} : await runAtomExtractors({
    functionCode,
    functionInfo,
    fileMetadata,
    filePath,
    fullFileCode: fullFileCode || functionCode
  });

  const dataFlowV2 = isStructural ? null : extractDataFlowSafe(functionInfo, functionCode, filePath);

  const complexity = calculateComplexity(functionCode);
  const linesOfCode = functionCode.split('\n').length;

  const atomMetadata = buildAtomMetadata({
    functionInfo,
    filePath,
    linesOfCode,
    complexity,
    dataFlowV2,
    functionCode,
    imports,
    jsdocContracts: fileMetadata.jsdoc,
    performanceHints: extractorResults.performanceHints,
    performanceMetrics: extractorResults.performanceMetrics,
    ...extractorResults
  });

  atomMetadata.isPhase2Complete = !isStructural;

  if (!isStructural) {
    atomMetadata.semantic = semanticAnalyzer.analyzeAtom(atomMetadata, functionCode);
  } else {
    atomMetadata.semantic = {};
  }

  enrichWithDNA(atomMetadata, functionInfo.name);

  atomMetadata.archetype = detectAtomArchetype(atomMetadata);

  const purposeInfo = detectAtomPurpose(atomMetadata, filePath);
  atomMetadata.purpose = purposeInfo.purpose;
  atomMetadata.purposeReason = purposeInfo.purposeReason;
  atomMetadata.purposeConfidence = purposeInfo.purposeConfidence;
  atomMetadata.isDeadCode = purposeInfo.isDeadCode;

  return atomMetadata;
}

export default { extractAtoms, extractAtomMetadata };
