function buildConnectedSystems(changeType = 'folderization') {
  const folderizationSystems = [
    { name: 'folderization', role: 'planner' },
    { name: 'rename_folderized_family', role: 'normalizer' },
    { name: 'technical_debt_report', role: 'consumer' },
    { name: 'status_panel', role: 'visibility' },
    { name: 'health_snapshot', role: 'history' },
    { name: 'compiler_explainability', role: 'explainability' },
    { name: 'cache_policy', role: 'freshness' },
    { name: 'watcher', role: 'reconciliation' },
    { name: 'drift_assessment', role: 'governance' }
  ];

  if (changeType === 'impact_wave') {
    return [
      { name: 'impact_wave_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'export_validation', role: 'verification' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'topology_regression') {
    return [
      { name: 'topology_regression_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'semantic_coverage', role: 'verification' },
      { name: 'semantic_persistence', role: 'storage' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'semantic_coverage') {
    return [
      { name: 'semantic_coverage_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'semantic_persistence', role: 'storage' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'policy_drift') {
    return [
      { name: 'compiler_policy_conformance_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' },
      { name: 'semantic_persistence', role: 'storage' }
    ];
  }

  if (changeType === 'pipeline_health') {
    return [
      { name: 'pipeline_health_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'pipeline_orphan') {
    return [
      { name: 'pipeline_orphan_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' },
      { name: 'semantic_persistence', role: 'storage' }
    ];
  }

  if (changeType === 'duplicate_risk_remediation') {
    return [
      { name: 'duplicate_risk_remediation', role: 'evidence' },
      { name: 'folderization', role: 'structure' },
      { name: 'rename_folderized_family', role: 'normalizer' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'integrity_guard') {
    return [
      { name: 'integrity_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'semantic_persistence', role: 'storage' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'rename') {
    return [
      { name: 'rename_folderized_family', role: 'planner' },
      { name: 'folderization', role: 'context' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'watcher', role: 'reconciliation' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'naming_debt') {
    return [
      { name: 'simulate_naming_debt_impact', role: 'simulator' },
      { name: 'rename_folderized_family', role: 'normalizer' },
      { name: 'normalize_folderized_family_names', role: 'executor' },
      { name: 'folderization', role: 'context' },
      { name: 'validate_imports', role: 'verification' },
      { name: 'fix_imports', role: 'repair' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'watcher', role: 'reconciliation' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  return folderizationSystems;
}

export { buildConnectedSystems };
