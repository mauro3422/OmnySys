export function compactStandardization(standardization = null) {
  if (!standardization) return null;
  return {
    canonicalFamilies: standardization.canonicalFamilies?.length || 0,
    stableCanonicalFamilies: standardization.stableCanonicalFamilies?.length || 0,
    summary: standardization.summary || null
  };
}
