function collectCallers(fileAnalysis) {
  return fileAnalysis.usedBy ? [...fileAnalysis.usedBy] : [];
}

function collectImportedCallees(fileAnalysis) {
  if (!fileAnalysis.imports) {
    return [];
  }

  return fileAnalysis.imports.map((entry) => entry.source || entry);
}

function collectExternalCallees(fileAnalysis, calleeSet) {
  if (!fileAnalysis.atoms) {
    return;
  }

  for (const atom of fileAnalysis.atoms) {
    if (!atom.calls) {
      continue;
    }

    for (const call of atom.calls) {
      if (call.type === 'external' && call.name) {
        calleeSet.add(call.name);
      }
    }
  }
}

export function buildRelationshipHierarchy(fileAnalysis) {
  const callers = collectCallers(fileAnalysis);
  const calleeSet = new Set(collectImportedCallees(fileAnalysis));

  collectExternalCallees(fileAnalysis, calleeSet);

  return {
    callers,
    callees: [...calleeSet]
  };
}

function hasAtomValidation(atom) {
  return Boolean(atom.hasValidation || atom.params?.some((param) => param.validation));
}

function hasAtomErrorHandling(atom) {
  return Boolean(atom.hasErrorHandling || atom.errorFlow?.hasTryCatch);
}

export function analyzeRelationshipBarriers(fileAnalysis) {
  const barriers = {
    hasValidation: false,
    hasErrorHandling: false,
    validationPoints: []
  };

  if (!fileAnalysis.atoms) {
    return barriers;
  }

  for (const atom of fileAnalysis.atoms) {
    if (hasAtomValidation(atom)) {
      barriers.hasValidation = true;
      barriers.validationPoints.push(atom.name);
    }

    if (hasAtomErrorHandling(atom)) {
      barriers.hasErrorHandling = true;
    }
  }

  return barriers;
}
