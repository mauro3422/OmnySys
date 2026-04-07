function buildPropagationMode(changeType, decision, mode = null) {
  if (mode) {
    return mode;
  }

  if (changeType === 'impact_wave') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'topology_regression') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'semantic_coverage') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'policy_drift') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'pipeline_health' || changeType === 'pipeline_orphan') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'duplicate_risk_remediation') {
    if (decision === 'reject') return 'recommend_only';
    if (decision === 'approve') return 'remediate_and_rewrite';
    return 'recommend_and_review';
  }

  if (changeType === 'integrity_guard') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  return decision === 'approve'
    ? 'move_and_rewrite'
    : decision === 'review'
      ? 'review'
      : decision === 'already_folderized'
        ? 'rename_only'
        : 'blocked';
}

export { buildPropagationMode };
