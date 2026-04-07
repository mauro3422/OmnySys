/**
 * @fileoverview Templates and heuristics for policy drift classification and repair.
 *
 * Defines the mapping between drift types and their fix strategies (auto-fix vs manual).
 *
 * @module shared/compiler/policy-drift-templates
 */

// ── Fix Templates (mapeo drift → repair) ──────────────────────────

export const FIX_TEMPLATES = {
  // Data Gateway Drift
  manual_data_gateway_bypass: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import del data gateway contract',
    generateFix: (finding, source) => ({
      addImport: "import { buildDataGatewayContract, getSystemMapPersistenceCoverage } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['buildDataGatewayContract', 'getSystemMapPersistenceCoverage'],
      recommendedAction: 'Usar buildDataGatewayContract() en vez de leer tablas directamente'
    })
  },
  manual_data_gateway_sql_read: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import del data gateway contract para queries SQL',
    generateFix: (finding, source) => ({
      addImport: "import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['getSystemMapPersistenceCoverage', 'shouldTrustSystemMapDependencies'],
      recommendedAction: 'Verificar coverage antes de hacer SQL directo a tablas canónicas'
    })
  },

  // Propagation Expansion Drift
  propagation_surface_without_contract: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import del propagation contract',
    generateFix: (finding, source) => {
      const needsBuildPropagation = /buildPropagationPlan/.test(source) ? false : true;
      return {
        addImport: needsBuildPropagation
          ? "import { buildPropagationPlan, summarizePropagationPlan } from '#shared/compiler/index.js';"
          : "import { summarizePropagationPlan } from '#shared/compiler/index.js';",
        importPath: '#shared/compiler/index.js',
        importedNames: needsBuildPropagation
          ? ['buildPropagationPlan', 'summarizePropagationPlan']
          : ['summarizePropagationPlan'],
        recommendedAction: 'Importar propagation contract antes de emitir payloads de status/issues'
      };
    }
  },

  // Summary Presentation Drift
  manual_summary_recomposition: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Usar canonical summary APIs en vez de reconstruir payloads',
    generateFix: (finding, source) => ({
      addImport: "import { loadCompilerDiagnosticsSnapshot } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['loadCompilerDiagnosticsSnapshot'],
      recommendedAction: 'Usar loadCompilerDiagnosticsSnapshot() en vez de reconstruir compilerExplainability/surfaceAudit manualmente'
    })
  },

  // Metadata Propagation Drift
  parallel_metadata_universes: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import de metadata propagation coverage',
    generateFix: (finding, source) => ({
      addImport: "import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['getSystemMapPersistenceCoverage', 'shouldTrustSystemMapDependencies'],
      recommendedAction: 'Verificar system map coverage antes de mezclar files + system_files'
    })
  },
  legacy_system_map_without_coverage: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import de system map persistence coverage',
    generateFix: (finding, source) => ({
      addImport: "import { getSystemMapPersistenceCoverage } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['getSystemMapPersistenceCoverage'],
      recommendedAction: 'Llamar getSystemMapPersistenceCoverage() antes de confiar en system_files'
    })
  },

  // Semantic Surface Granularity Drift
  raw_semantic_connections_summary: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import de semantic surface granularity contract',
    generateFix: (finding, source) => ({
      addImport: "import { getSemanticSurfaceGranularity } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['getSemanticSurfaceGranularity'],
      recommendedAction: 'Usar getSemanticSurfaceGranularity() antes de leer semantic_connections directamente'
    })
  },
  mixed_semantic_granularity: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar import de semantic surface granularity contract',
    generateFix: (finding, source) => ({
      addImport: "import { getSemanticSurfaceGranularity } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['getSemanticSurfaceGranularity'],
      recommendedAction: 'Usar getSemanticSurfaceGranularity() para entender la granularidad de surfaces semánticas'
    })
  },

  // Reuse Rules - Auto-Fixables
  canonical_diagnostics_bypass: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Usar canonical diagnostics snapshot en vez de reconstruir manualmente',
    generateFix: (finding, source) => ({
      addImport: "import { loadCompilerDiagnosticsSnapshot } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['loadCompilerDiagnosticsSnapshot'],
      recommendedAction: 'Reemplazar reconstrucción manual de diagnostics con loadCompilerDiagnosticsSnapshot()'
    })
  },
  live_row_sync_missing: {
    fixType: 'add_import',
    autoFixable: true,
    description: 'Agregar ensureLiveRowSync antes de leer drift stats',
    generateFix: (finding, source) => ({
      addImport: "import { ensureLiveRowSync } from '#shared/compiler/index.js';",
      importPath: '#shared/compiler/index.js',
      importedNames: ['ensureLiveRowSync'],
      recommendedAction: 'Llamar ensureLiveRowSync() antes de leer live/stale row counts'
    })
  },

  // Reuse Rules - Necesitan Atención Humana/IA
  manual_topology_scan: {
    fixType: 'requires_refactor',
    autoFixable: false,
    requiresHumanAttention: true,
    description: 'Reemplazar scan manual de topología con APIs de impacto canónicas',
    humanAttentionReason: 'Requiere reescribir lógica de caminar grafo → usar getFileImpactSummary/getFileDependents',
    recommendedAction: 'Refactorizar para usar canonical impact APIs: getFileImpactSummary(), getFileDependents(), getTransitiveDependents()'
  },
  manual_runtime_ownership: {
    fixType: 'requires_refactor',
    autoFixable: false,
    requiresHumanAttention: true,
    description: 'Usar runtime-ownership.js en vez de reimplementar daemon lock',
    humanAttentionReason: 'Requiere reemplazar lógica inline de daemon ownership con módulo canónico',
    recommendedAction: 'Importar y usar runtime-ownership.js desde shared/compiler'
  },
  manual_watcher_diagnostics_reconciliation: {
    fixType: 'requires_refactor',
    autoFixable: false,
    requiresHumanAttention: true,
    description: 'Usar watcher diagnostics helpers en vez de mezclar persistence + lifecycle inline',
    humanAttentionReason: 'Requiere rediseñar cómo se compone watcher reconciliation con diagnostics',
    recommendedAction: 'Route watcher reconciliation through shared/compiler watcher diagnostics helpers'
  },
  manual_symbol_duplicate_scan: {
    fixType: 'requires_refactor',
    autoFixable: false,
    requiresHumanAttention: true,
    description: 'Usar repository-backed duplicate APIs en vez de getAllAtoms()',
    humanAttentionReason: 'Requiere cambiar de scan en memoria a APIs de repositorio',
    recommendedAction: 'Use repository-backed duplicate/symbol APIs instead of scanning getAllAtoms()'
  },
  manual_file_discovery_scan: {
    fixType: 'requires_refactor',
    autoFixable: false,
    requiresHumanAttention: true,
    description: 'Usar canonical query APIs en vez de caminar filesystem manualmente',
    humanAttentionReason: 'Requiere reemplazar fs.readdir/walkDir con APIs de discovery canónicas',
    recommendedAction: 'Prefer canonical query/storage APIs before walking the filesystem manually'
  },
  manual_duplicate_sql: {
    fixType: 'requires_refactor',
    autoFixable: false,
    requiresHumanAttention: true,
    description: 'Usar duplicate-dna.js en vez de SQL fragments embedidos',
    humanAttentionReason: 'Requiere refactorizar SQL embedido para usar API canónica de duplicates',
    recommendedAction: 'Build duplicate keys through duplicate-dna.js / repository utils barrel'
  }
};

// ── Heurística de Clasificación de Drifts ──────────────────────────

/**
 * Clasifica un drift como auto-fixable o requiere-atención-humana
 * @param {Object} finding - Finding de drift
 * @returns {Object} Clasificación con metadata
 */
export function classifyDrift(finding) {
  const template = FIX_TEMPLATES[finding.issueType];
  
  if (!template) {
    return {
      issueType: finding.issueType,
      classification: 'unknown',
      autoFixable: false,
      requiresHumanAttention: true,
      humanAttentionReason: 'No template disponible - requiere análisis manual',
      recommendedAction: 'Revisar manualmente el finding y decidir acción'
    };
  }
  
  return {
    issueType: finding.issueType,
    classification: template.fixType,
    autoFixable: template.autoFixable || false,
    requiresHumanAttention: template.requiresHumanAttention || false,
    humanAttentionReason: template.humanAttentionReason || null,
    description: template.description,
    recommendedAction: template.recommendedAction,
    estimatedEffort: template.fixType === 'add_import' ? 'low' : 'medium'
  };
}
