export function createIndexerErrorResult(error) {
  return {
    metadata: { totalAtoms: 0, totalFunctions: 0, totalFunctionLinks: 0 },
    atoms: [],
    files: [],
    error: error.message
  };
}
