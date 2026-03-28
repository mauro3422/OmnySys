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

function buildMoveTarget(candidate, memberPath, barrelPath) {
  const normalizedMemberPath = normalizeFolderizationPath(memberPath);
  const normalizedBarrelPath = normalizeFolderizationPath(barrelPath || '');
  const isBarrel = normalizedBarrelPath && normalizedMemberPath === normalizedBarrelPath;
  const basename = getMemberBasename(memberPath);

  return isBarrel
    ? `${candidate.recommendedFolder}/index.js`
    : `${candidate.recommendedFolder}/${basename}`;
}

function parseImportTargets(row) {
  if (Array.isArray(row?.importTargets)) {
    return row.importTargets;
  }

  if (Array.isArray(row?.imports)) {
    return row.imports
      .map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry))
      .filter(Boolean);
  }

  return [];
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
  const strongFolderSignal = candidate.confidence >= 55 && candidate.fileCount >= 4;
  const lowCrossFamilyPressure = importImpact.impactedFileCount <= Math.max(12, candidate.fileCount * 3);
  const lowRewriteLoad = importImpact.rewriteCount <= Math.max(20, candidate.fileCount * 5);

  if (!strongFolderSignal) {
    return 'reject';
  }

  if (!lowCrossFamilyPressure || !lowRewriteLoad) {
    return 'review';
  }

  return 'approve';
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
