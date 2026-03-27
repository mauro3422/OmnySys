function mapDebtFinding(finding = {}) {
  return {
    symbol: finding.symbol,
    type: finding.duplicateType,
    semanticFingerprint: finding.semanticFingerprint || null,
    totalInstances: finding.totalInstances || 0,
    duplicateFiles: finding.duplicateFiles || []
  };
}

export {
  mapDebtFinding
};
