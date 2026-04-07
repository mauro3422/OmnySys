import { collectManualReuseFindings } from './reuse-findings.js';
import { collectConformanceFindings } from './policy-conformance-rules.js';
import { buildPolicyImportMap } from './reuse.js';
import { isCompilerRuntimeFile } from './file-discovery.js';

function normalizePathLocal(p) {
  return p ? p.replace(/\\/g, '/') : p;
}

// ── Exempt paths: Canonical surfaces y módulos del sistema ──────────

function isCanonicalLayerModule(normalizedPath = '') {
  const canonicalPaths = [
    // Superficies canónicas (del inventory)
    '/shared/compiler/',  // SON el canonical layer
    // Storage/persistence - SU TRABAJO es SQL directo
    '/storage/repository/',
    '/storage/atoms/',
    '/storage/enrichment/',
    // Query layer - SU TRABAJO es hacer queries
    '/layer-c-memory/query/',
    // File watcher - necesita acceso directo
    '/core/file-watcher/',
    // Meta-detector - SU TRABAJO es verificar integridad
    '/core/meta-detector/',
    // MCP tools - la mayoría usa APIs canónicas
    '/layer-c-memory/mcp/tools/',
    '/layer-c-memory/mcp/core/initialization/',
    // Scripts de utilidad
    '/scripts/',
    '/tests/'
  ];

  return canonicalPaths.some(p => normalizedPath.includes(p));
}

// ── Heurística: ¿El archivo YA usa buenas prácticas? ──────────────

function usesGoodPractices(source = '') {
  // Si ya importa APIs canónicas como guards, está bien
  const hasGoodImports = /getSystemMapPersistenceCoverage|getSemanticSurfaceGranularity|getFileUniverseGranularity|ensureLiveRowSync|buildPropagationPlan|summarizePropagationPlan|loadCompilerDiagnosticsSnapshot/.test(source);
  
  // Si verifica coverage antes de hacer SQL, está bien
  const hasCoverageChecks = /shouldTrustSystemMapDependencies|shouldTrustSystemMapPersistence/.test(source);
  
  // Si es un wrapper/re-export, está bien
  const isWrapper = /export.*from.*['"]\.\//.test(source) && !/db\.prepare|FROM\s+\w+/.test(source);
  
  return hasGoodImports || hasCoverageChecks || isWrapper;
}

// ── Heurística: ¿Es un módulo de infraestructura legítima? ─────

function isInfrastructureModule(normalizedPath = '', source = '') {
  // Módulos que por definición necesitan acceso bajo
  const infrastructurePatterns = [
    /persistence/,
    /repository/,
    /storage/,
    /database/,
    /sqlite/,
    /migration/,
    /repair/,
    /backup/
  ];

  return infrastructurePatterns.some(p => p.test(normalizedPath));
}

function collectManualPolicyFindingsForCompiler(normalizedPath, source, imports) {
  return collectManualReuseFindings(normalizedPath, source, imports);
}

export function detectCompilerPolicyDriftFromSource(filePath, source = '') {
  const normalizedPath = normalizePathLocal(filePath);

  if (!isCompilerRuntimeFile(normalizedPath) || !source) {
    return [];
  }

  // Exempt paths estándar
  if (
    normalizedPath.endsWith('/guard-standards.js') ||
    normalizedPath.endsWith('/shared-state-guard.js') ||
    normalizedPath.endsWith('/shared-state/guard.js') ||
    normalizedPath.endsWith('/duplicate-conceptual-core.js')
  ) {
    return [];
  }

  // HEURÍSTICA 1: Si es parte del canonical layer o infraestructura, exempt
  if (isCanonicalLayerModule(normalizedPath)) {
    return [];
  }

  // HEURÍSTICA 2: Si es módulo de infraestructura legítima, exempt
  if (isInfrastructureModule(normalizedPath, source)) {
    return [];
  }

  // HEURÍSTICA 3: Si ya usa buenas prácticas, exempt
  if (usesGoodPractices(source)) {
    return [];
  }

  const policyImports = buildPolicyImportMap(source);
  return [
    ...collectManualPolicyFindingsForCompiler(normalizedPath, source, policyImports),
    ...collectConformanceFindings(normalizedPath, source)
  ];
}
