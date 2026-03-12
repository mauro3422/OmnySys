export function createBaseChain(idGenerator, atom, stepBuilder) {
  const step = stepBuilder.create(atom);

  return {
    id: idGenerator.generate(),
    entryFunction: atom.name,
    exitFunction: atom.name,
    steps: [step],
    totalFunctions: 1,
    totalTransforms: atom.dataFlow?.transformations?.length || 0,
    hasSideEffects: atom.hasSideEffects || false,
    complexity: atom.complexity || 0
  };
}

export function extendChainWithCallee(chain, calleeChain) {
  chain.steps.push(...calleeChain.steps.slice(1));
  chain.exitFunction = calleeChain.exitFunction;
  chain.totalFunctions += calleeChain.totalFunctions;
  chain.totalTransforms += calleeChain.totalTransforms;
  chain.hasSideEffects = chain.hasSideEffects || calleeChain.hasSideEffects;
  chain.complexity += calleeChain.complexity;
}

export function groupChainsByEntry(chains) {
  const byEntry = new Map();

  for (const chain of chains) {
    if (!byEntry.has(chain.entryFunction)) {
      byEntry.set(chain.entryFunction, []);
    }

    byEntry.get(chain.entryFunction).push(chain);
  }

  return byEntry;
}

export function mergeUniqueChainSteps(base, chains) {
  const seenAtomIds = new Set(base.steps.map(step => step.atomId));

  for (const chain of chains) {
    if (chain === base) continue;

    for (const step of chain.steps) {
      if (seenAtomIds.has(step.atomId)) continue;

      seenAtomIds.add(step.atomId);
      base.steps.push(step);
    }
  }
}
