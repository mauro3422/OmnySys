import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:HelperReuseDetector');

const HELPER_DIRECTORIES = [
  '/utils/',
  '/shared/',
  '/helpers/',
  '/common/',
  '/lib/'
];

const UTILITY_NAME_PATTERNS = [
  /^normalize/,
  /^format/,
  /^parse/,
  /^validate/,
  /^sanitize/,
  /^transform/,
  /^extract/,
  /^build/,
  /^create/,
  /^make/,
  /^get/,
  /^set/,
  /^is/,
  /^has/,
  /^can/,
  /^should/
];

function getMatchReason(fingerprint, verb, chest, domain) {
  const [fVerb, fChest, fDomain] = fingerprint.split(':');

  if (fVerb === verb && fDomain === domain) {
    return 'Same verb and domain';
  }

  if (fVerb === verb && fChest === chest) {
    return 'Same verb and chest';
  }

  if (fVerb === verb) {
    return 'Same verb';
  }

  return 'Similar semantic pattern';
}

export async function findExistingHelpers(projectPath, semanticFingerprint, helperName) {
  const repo = getRepository(projectPath);
  if (!repo?.db) {
    logger.warn('[findExistingHelpers] DB not available');
    return [];
  }

  const [verb, chest, domain] = semanticFingerprint.split(':');

  const similarHelpers = repo.db.prepare(`
    SELECT a.name, a.file_path, a.lines_of_code, a.is_exported,
           json_extract(a.dna_json, '$.semanticFingerprint') as semanticFingerprint,
           json_extract(a.dna_json, '$.structuralHash') as structuralHash
    FROM atoms a
    WHERE json_extract(a.dna_json, '$.semanticFingerprint') LIKE ?
       OR json_extract(a.dna_json, '$.semanticFingerprint') LIKE ?
       OR json_extract(a.dna_json, '$.semanticFingerprint') LIKE ?
      AND a.atom_type IN ('function', 'arrow', 'method')
      AND (a.is_removed IS NULL OR a.is_removed = 0)
      AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
    ORDER BY a.is_exported DESC, a.lines_of_code ASC
    LIMIT 10
  `).all(
    `${verb}%:${domain}%`,
    `%:${chest}:%`,
    `${verb}:logic:core:%`
  );

  const utilityHelpers = similarHelpers.filter((helper) =>
    HELPER_DIRECTORIES.some((dir) => helper.file_path.includes(dir))
  );

  const namedHelpers = utilityHelpers.filter((helper) =>
    UTILITY_NAME_PATTERNS.some((pattern) => pattern.test(helper.name))
  );

  const excludingSelf = namedHelpers.filter((helper) =>
    helper.name !== helperName || !helper.file_path.includes(helperName)
  );

  logger.debug(`[findExistingHelpers] Found ${excludingSelf.length} similar helpers`);

  return excludingSelf.map((helper) => ({
    name: helper.name,
    filePath: helper.file_path,
    linesOfCode: helper.lines_of_code,
    isExported: helper.is_exported === 1,
    semanticFingerprint: helper.semanticFingerprint,
    structuralHash: helper.structuralHash,
    matchReason: getMatchReason(helper.semanticFingerprint, verb, chest, domain)
  }));
}
