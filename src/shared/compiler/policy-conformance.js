/**
 * @fileoverview policy-conformance.js
 *
 * Reglas compartidas para detectar deriva de políticas del compilador.
 * La idea es detectar cuándo un módulo del watcher/MCP vuelve a implementar
 * a mano señales que ya tienen una API canónica.
 *
 * @module shared/compiler/policy-conformance
 */

import fs from 'fs/promises';
import path from 'path';

const TARGET_DIRS = [
  'src/core/file-watcher',
  'src/layer-c-memory/mcp',
  'src/layer-c-memory/query'
];

const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const COMPILER_POLICY_SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium'
};
const COMPILER_POLICY_AREA = {
  DUPLICATES: 'duplicates',
  IMPACT: 'impact',
  FILE_DISCOVERY: 'file_discovery'
};

function normalizePath(filePath = '') {
  return filePath.replace(/\\/g, '/');
}

function isJavaScriptFile(filePath = '') {
  return JS_EXTENSIONS.has(path.extname(filePath));
}

function shouldScanCompilerFile(filePath = '') {
  const normalized = normalizePath(filePath);
  if (!isJavaScriptFile(normalized)) return false;
  if (normalized.includes('/tests/')) return false;
  if (normalized.includes('/__tests__/')) return false;
  return TARGET_DIRS.some((dir) => normalized.startsWith(`${dir}/`));
}

function createFinding(rule, severity, policyArea, message, recommendation) {
  return {
    rule,
    severity,
    policyArea,
    message,
    recommendation
  };
}

function looksLikeManualTopologyScan(source = '') {
  const manualGraphWalk =
    /(allAtoms|graphAtoms)\.(filter|map|reduce|find)\([\s\S]{0,600}?(calledBy|callerId|calls?|callees?|dependents?|affectedFiles|dependencyTree|brokenCallers|totalCallers)/.test(source) ||
    /new\s+Set\(\)\s*;[\s\S]{0,600}?(affectedFiles\.add|dependents\.push|dependencyTree\.push)/.test(source) ||
    /(callerId|calledBy|calls?)\?.*(filter|map|some|find)\(/.test(source);

  const topologyReportingOnly =
    /(buildKeyMetrics|deriveSchema|computeCorrelations|fieldEvolution|schemaType\s*:\s*['"]atoms['"])/.test(source) &&
    !/(affectedFiles\.add|dependents\.push|dependencyTree\.push|brokenCallers|totalCallers)/.test(source);

  return manualGraphWalk && !topologyReportingOnly;
}

export function detectCompilerPolicyDriftFromSource(filePath, source = '') {
  const normalizedPath = normalizePath(filePath);
  const findings = [];

  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return findings;
  }

  const importsGetAllAtoms = /getAllAtoms/.test(source);
  const importsImpactApis = /getFileDependents|getTransitiveDependents/.test(source);
  const importsDuplicateApi = /getDuplicateKeySqlForMode|getDuplicateKeySql|getStructuralDuplicateKeySql|DUPLICATE_MODES/.test(source);

  if (
    importsGetAllAtoms &&
    /atom\.name\s*===\s*symbolName|instance\.name\s*===\s*symbolName/.test(source)
  ) {
    findings.push(createFinding(
      'manual_symbol_duplicate_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.DUPLICATES,
      'Manual symbol duplicate scan detected',
      'Use repository-backed duplicate/symbol APIs instead of scanning getAllAtoms() in memory.'
    ));
  }

  if (
    importsGetAllAtoms &&
    looksLikeManualTopologyScan(source) &&
    !importsImpactApis
  ) {
    findings.push(createFinding(
      'manual_topology_scan',
      COMPILER_POLICY_SEVERITY.HIGH,
      COMPILER_POLICY_AREA.IMPACT,
      'Manual topology/impact scan detected',
      'Use the canonical file dependency APIs (getFileDependents/getTransitiveDependents) instead of rebuilding impact from getAllAtoms().'
    ));
  }

  if (
    /json_extract\([^)]*dna_json/.test(source) &&
    /duplicate_key|DuplicateGroups/.test(source) &&
    !importsDuplicateApi &&
    !normalizedPath.endsWith('/duplicate-dna.js')
  ) {
    findings.push(createFinding(
      'manual_duplicate_sql',
      COMPILER_POLICY_SEVERITY.HIGH,
      COMPILER_POLICY_AREA.DUPLICATES,
      'Manual duplicate DNA SQL detected',
      'Build duplicate keys through duplicate-dna.js / repository utils barrel instead of embedding SQL fragments.'
    ));
  }

  if (
    /fs\.readdir|fs\.readFile/.test(source) &&
    /collectFilesRecursively|readdirSync|walkDir|walkDirectory/.test(source) &&
    normalizedPath.includes('/mcp/')
  ) {
    findings.push(createFinding(
      'manual_file_discovery_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.FILE_DISCOVERY,
      'Manual file discovery scan detected inside MCP/compiler runtime',
      'Prefer canonical query/storage APIs before walking the filesystem manually inside MCP/runtime code.'
    ));
  }

  return findings;
}

export function summarizeCompilerPolicyDrift(findings = []) {
  const summary = {
    total: findings.length,
    high: 0,
    medium: 0,
    byPolicyArea: {},
    byRule: {}
  };

  for (const finding of findings) {
    if (finding?.severity === COMPILER_POLICY_SEVERITY.HIGH) summary.high += 1;
    if (finding?.severity === COMPILER_POLICY_SEVERITY.MEDIUM) summary.medium += 1;
    summary.byPolicyArea[finding.policyArea] = (summary.byPolicyArea[finding.policyArea] || 0) + 1;
    summary.byRule[finding.rule] = (summary.byRule[finding.rule] || 0) + 1;
  }

  return summary;
}

async function collectFilesRecursively(rootPath, relativeDir) {
  const dirPath = path.join(rootPath, relativeDir);
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dirPath, entry.name);
    const relative = normalizePath(path.relative(rootPath, absolute));
    if (entry.isDirectory()) {
      files.push(...await collectFilesRecursively(rootPath, relative));
      continue;
    }
    if (shouldScanCompilerFile(relative)) {
      files.push(relative);
    }
  }

  return files;
}

export async function scanCompilerPolicyDrift(rootPath, options = {}) {
  const { limit = 20 } = options;
  const candidateLists = await Promise.all(TARGET_DIRS.map((dir) => collectFilesRecursively(rootPath, dir)));
  const files = [...new Set(candidateLists.flat())];
  const findings = [];

  for (const filePath of files) {
    const absolutePath = path.join(rootPath, filePath);
    const source = await fs.readFile(absolutePath, 'utf8').catch(() => null);
    if (!source) continue;

    const localFindings = detectCompilerPolicyDriftFromSource(filePath, source);
    for (const finding of localFindings) {
      findings.push({
        ...finding,
        filePath
      });
      if (findings.length >= limit) {
        return findings;
      }
    }
  }

  return findings;
}
