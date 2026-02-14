/**
 * @fileoverview Audit Context - Main Entry Point
 * 
 * Auditoría de Contexto Completo - Ahora modular
 * 
 * @module audit
 */

import fs from 'fs/promises';
import path from 'path';
import { checkFields, calculateCompletenessScore } from './checks/field-checker.js';
import { generateFileReport, generateSummary } from './reporters/audit-reporter.js';

/**
 * Audit a single file
 * @param {string} filePath - File path
 * @returns {Promise<Object>} Audit result
 */
export async function auditFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    const checkResult = checkFields(data);
    return generateFileReport(filePath, checkResult);
  } catch (error) {
    return {
      file: path.basename(filePath),
      path: filePath,
      error: error.message,
      hasCompleteContext: false,
      score: 0
    };
  }
}

/**
 * Audit directory
 * @param {string} dirPath - Directory path
 * @param {Object} options - Options
 * @returns {Promise<Object>} Audit results
 */
export async function auditDirectory(dirPath, options = {}) {
  const { pattern = /\.json$/ } = options;

  const files = await fs.readdir(dirPath);
  const jsonFiles = files.filter(f => pattern.test(f));

  const fileReports = [];
  for (const file of jsonFiles) {
    const filePath = path.join(dirPath, file);
    const report = await auditFile(filePath);
    fileReports.push(report);
  }

  return {
    files: fileReports,
    summary: generateSummary(fileReports)
  };
}

/**
 * Run full audit
 * @param {string} projectPath - Project path
 * @returns {Promise<Object>} Full audit results
 */
export async function runAudit(projectPath) {
  const omnysysDir = path.join(projectPath, '.omnysysdata');

  // Audit atoms
  const atomsDir = path.join(omnysysDir, 'atoms');
  const atomsAudit = await auditDirectory(atomsDir).catch(() => ({ files: [], summary: { total: 0 } }));

  // Audit molecules
  const moleculesDir = path.join(omnysysDir, 'molecules');
  const moleculesAudit = await auditDirectory(moleculesDir).catch(() => ({ files: [], summary: { total: 0 } }));

  // Combine results
  const allFiles = [...atomsAudit.files, ...moleculesAudit.files];

  return {
    atoms: atomsAudit,
    molecules: moleculesAudit,
    summary: generateSummary(allFiles)
  };
}

// Re-export
export * from './constants.js';
export * from './checks/field-checker.js';
export * from './reporters/audit-reporter.js';

// Default export
export default {
  auditFile,
  auditDirectory,
  runAudit
};
