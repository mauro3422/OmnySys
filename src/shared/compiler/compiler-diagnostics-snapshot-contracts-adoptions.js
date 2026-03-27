export function buildResolvedCanonicalAdoptions({
  canonicalAdoptionEvidence,
  persistedFileCoverage,
  canonicalAdoptions
}) {
  return {
    centralityCoverage: canonicalAdoptionEvidence.centralityCoverage.adopted,
    sharedStateContention: canonicalAdoptionEvidence.sharedStateContention.adopted,
    scannedFileManifest:
      canonicalAdoptionEvidence.scannedFileManifest.adopted &&
      persistedFileCoverage?.synchronized === true,
    ...(canonicalAdoptions || {})
  };
}
