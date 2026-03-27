function normalizeDriftArea(area, count = 0) {
  return {
    area,
    count,
    status: count > 0 ? 'adoption_gap' : 'stable'
  };
}

function buildCanonicalAdoptionCoverage(canonicalFamilies = [], adoptionGaps = []) {
  const totalFamilies = canonicalFamilies.length;
  const adoptedFamilies = canonicalFamilies.filter((family) =>
    !adoptionGaps.some((gap) => gap.area === family.id)
  ).length;

  return {
    totalFamilies,
    adoptedFamilies,
    adoptionRatio: totalFamilies > 0 ? Number((adoptedFamilies / totalFamilies).toFixed(3)) : 0,
    gapFamilies: adoptionGaps.length
  };
}

export {
  normalizeDriftArea,
  buildCanonicalAdoptionCoverage
};
