import { loadFolderizationRows, normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import {
  findFolderizationCandidateForPaths,
  findFolderizationCandidatesFromRepo
} from './directory-structure-folderization-analysis.js';

function getMemberBasename(filePath = '') {
  const normalized = normalizeFolderizationPath(filePath);
  const baseName = normalized.split('/').pop() || '';
  return baseName || '';
}

/**
 * Strip the family prefix from a basename when it's redundant.
 * E.g., "compiler-metrics-snapshot-helpers.js" with familyRoot "compiler-metrics-snapshot"
 * becomes "helpers.js".
 */
function normalizeMemberBasename(basename, familyRoot) {
  const stem = basename.replace(/\.js$/i, '');
  const ext = basename.slice(stem.length); // ".js" or ""
  const familyPrefix = `${familyRoot}-`;

  if (stem.startsWith(familyPrefix)) {
    return `${stem.slice(familyPrefix.length)}${ext}`;
  }

  return basename;
}

function buildMoveTarget(candidate, memberPath, barrelPath) {
  const normalizedMemberPath = normalizeFolderizationPath(memberPath);
  const normalizedBarrelPath = normalizeFolderizationPath(barrelPath || '');
  const isBarrel = normalizedBarrelPath && normalizedMemberPath === normalizedBarrelPath;
  const rawBasename = getMemberBasename(memberPath);
  const normalizedBasename = normalizeMemberBasename(rawBasename, candidate.familyRoot);

  return isBarrel
    ? `${candidate.recommendedFolder}/index.js`
    : `${candidate.recommendedFolder}/${normalizedBasename}`;
}

function parseImportTargets(row) {
  if (Array.isArray(row?.dependencyTargets)) {
    return row.dependencyTargets;
  }

  const importTargets = Array.isArray(row?.importTargets)
    ? row.importTargets
    : Array.isArray(row?.imports)
      ? row.imports.map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry)).filter(Boolean)
      : [];
  const exportTargets = Array.isArray(row?.exportTargets)
    ? row.exportTargets
    : Array.isArray(row?.exports)
      ? row.exports.map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry?.from || '')).filter(Boolean)
      : [];

  return Array.from(new Set([...importTargets, ...exportTargets]));
}

function summarizeImportImpact(candidate, rows = []) {
  const targetSet = new Set((candidate.files || []).map((filePath) => normalizeFolderizationPath(filePath)));
  const impactedFiles = [];

  for (const row of rows) {
    if (targetSet.has(row.path)) {
      continue;
    }

    const importTargets = parseImportTargets(row);
    const matchedImports = importTargets.filter((target) => targetSet.has(normalizeFolderizationPath(target)));
    if (matchedImports.length === 0) {
      continue;
    }

    impactedFiles.push({
      filePath: row.path,
      matchedImports,
      importCount: matchedImports.length,
      exportCount: Number(row.exportCount || 0),
      moduleName: row.moduleName || null
    });
  }

  impactedFiles.sort((a, b) => b.importCount - a.importCount || a.filePath.localeCompare(b.filePath));

  return {
    impactedFileCount: impactedFiles.length,
    impactedFiles,
    rewriteCount: impactedFiles.reduce((sum, item) => sum + item.importCount, 0)
  };
}

function decideMigration(candidate, importImpact) {
  // FIX: Alineado con scoreCandidateGroup minFileCount=2.
  // Familias pequeñas (2-3 archivos) son válidas si tienen alta cohesión.
  const strongFolderSignal = candidate.confidence >= 45 && candidate.fileCount >= 2;
  const mediumFolderSignal = candidate.confidence >= 55 && candidate.fileCount >= 3;
  const lowCrossFamilyPressure = importImpact.impactedFileCount <= Math.max(12, candidate.fileCount * 3);
  const lowRewriteLoad = importImpact.rewriteCount <= Math.max(20, candidate.fileCount * 5);

  if (!strongFolderSignal) {
    return 'reject';
  }

  if (!lowCrossFamilyPressure || !lowRewriteLoad) {
    return 'review';
  }

  // Families of 2 need higher confidence to auto-approve
  if (candidate.fileCount < 3 && candidate.confidence < 55) {
    return 'review';
  }

  return mediumFolderSignal ? 'approve' : 'review';
}

function buildRewriteMap(moveTargets = []) {
  const rewriteMap = {};

  for (const target of moveTargets) {
    if (!target?.from || !target?.to) {
      continue;
    }

    rewriteMap[normalizeFolderizationPath(target.from)] = normalizeFolderizationPath(target.to);
  }

  return rewriteMap;
}

export function buildFolderizationMigrationPlanFromRows(candidate, rows = []) {
  if (!candidate) {
    return null;
  }

  const familyEvolution = candidate.familyEvolution || null;
  // BUG FIX: No rechazar solo por migrationState='already_folderized'.
  // Ese estado solo indica que los archivos comparten prefijo de familia, pero NO verifica
  // si la subcarpeta física existe. Si no hay folderFileCount en la evolución (carpetas reales
  // dentro de la subcarpeta), permitir el plan.
  const hasRealFolderRows = (familyEvolution?.folderFileCount || 0) > 0;
  if (!candidate.alreadyFolderized && familyEvolution?.migrationState === 'already_folderized' && !hasRealFolderRows) {
    // Permitir continue - es una familia plana que necesita ser movida
  } else if (candidate.alreadyFolderized || familyEvolution?.migrationState === 'already_folderized' || hasRealFolderRows) {
    return {
      decision: 'reject',
      reason: 'Family is already folderized according to metadata evolution',
      sourceOfTruth: {
        filesTable: 'files',
        importMetadata: 'files.imports_json',
        exportMetadata: 'files.exports_json'
      },
      rewriteMap: {},
      candidate: {
        familyRoot: candidate.familyRoot,
        directory: candidate.directory,
        recommendedFolder: candidate.recommendedFolder,
        barrelFile: candidate.barrelFile?.path || null,
        confidence: candidate.confidence,
        fileCount: candidate.fileCount
      },
      moveTargets: [],
      importImpact: {
        impactedFileCount: 0,
        impactedFiles: [],
        rewriteCount: 0
      },
      breakingRisk: 'low',
      reasons: [
        'family already exists in a dedicated folder',
        'metadata evolution shows folderized member rows'
      ]
    };
  }

  const barrelPath = candidate.barrelFile?.path || null;
  const moveTargets = (candidate.files || []).map((memberPath) => ({
    from: normalizeFolderizationPath(memberPath),
    to: buildMoveTarget(candidate, memberPath, barrelPath)
  }));

  const importImpact = summarizeImportImpact(candidate, rows);
  const decision = decideMigration(candidate, importImpact);

  return {
    decision,
    sourceOfTruth: {
      filesTable: 'files',
      importMetadata: 'files.imports_json',
      exportMetadata: 'files.exports_json'
    },
    rewriteMap: buildRewriteMap(moveTargets),
    candidate: {
      familyRoot: candidate.familyRoot,
      directory: candidate.directory,
      recommendedFolder: candidate.recommendedFolder,
      barrelFile: barrelPath,
      confidence: candidate.confidence,
      fileCount: candidate.fileCount
    },
    moveTargets,
    importImpact,
    breakingRisk: decision === 'approve'
      ? 'low'
      : decision === 'review'
        ? 'medium'
        : 'high',
    reasons: [
      candidate.barrelFile ? 'candidate already has a likely barrel file' : 'candidate still lacks a clear barrel file',
      candidate.confidence >= 55 ? 'folderization confidence is above threshold' : 'folderization confidence is below threshold',
      importImpact.rewriteCount > 0 ? 'import rewrites are required' : 'no external import rewrites detected'
    ]
  };
}

export function buildFolderizationMigrationPlanFromRepo(repo, options = {}) {
  if (!repo?.db?.prepare) {
    return {
      decision: 'reject',
      reason: 'Repository is not available'
    };
  }

  const candidates = findFolderizationCandidatesFromRepo(repo, options);
  const rows = loadFolderizationRows(repo);

  const migrationCandidates = candidates.map((candidate) => ({
    ...candidate,
    migrationPlan: buildFolderizationMigrationPlanFromRows(candidate, rows)
  }));

  const focusCandidate = options.focusCandidate
    ? findFolderizationCandidateForPaths(migrationCandidates, Array.isArray(options.focusCandidate) ? options.focusCandidate : [options.focusCandidate])
    : migrationCandidates[0] || null;

  return {
    candidateCount: migrationCandidates.length,
    focusCandidate: focusCandidate?.migrationPlan || null,
    candidates: migrationCandidates.map((candidate) => candidate.migrationPlan)
  };
}
