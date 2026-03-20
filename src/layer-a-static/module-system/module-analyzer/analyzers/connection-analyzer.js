/**
 * @fileoverview Connection Analyzer
 *
 * Analyze connections between module files.
 *
 * @module module-analyzer/analyzers/connection-analyzer
 * @version 1.0.0
 */

import path from 'path';

export class ConnectionAnalyzer {
  constructor(molecules) {
    this.molecules = molecules;
    this.calleeByFunction = buildCalleeIndex(molecules);
  }

  analyze() {
    return (this.molecules || []).flatMap(callerMol =>
      analyzeMoleculeConnections(this, callerMol)
    );
  }

  findCalleeInModule(functionName) {
    return this.calleeByFunction.get(functionName) || null;
  }

  createConnection(callerMol, callerAtom, call) {
    const calleeMol = this.findCalleeInModule(call.name);
    if (!calleeMol || calleeMol.filePath === callerMol.filePath) {
      return null;
    }

    const calleeAtom = calleeMol.atoms?.find(a => a.name === call.name);

    return {
      from: {
        file: path.basename(callerMol.filePath),
        function: callerAtom.name,
        atomId: callerAtom.id
      },
      to: {
        file: path.basename(calleeMol.filePath),
        function: call.name,
        atomId: calleeAtom?.id
      },
      dataFlow: this.mapArguments(call, calleeAtom),
      callSite: call.line || 0,
      isAsync: call.isAsync || false
    };
  }

  mapArguments(call, calleeAtom) {
    if (!call.args || !calleeAtom?.dataFlow?.inputs) {
      return [];
    }

    return call.args.map((arg, index) => {
      const param = calleeAtom.dataFlow.inputs[index];
      return {
        position: index,
        source: arg.name || arg.code || String(arg),
        target: param?.name || `param_${index}`,
        transform: this.classifyTransform(arg)
      };
    });
  }

  classifyTransform(arg) {
    if (!arg) return 'unknown';
    if (arg.type === 'MemberExpression') return 'property_access';
    if (arg.type === 'CallExpression') return 'call_result';
    if (arg.type === 'Identifier') return 'direct_pass';
    return 'expression';
  }
}

function buildCalleeIndex(molecules) {
  const index = new Map();

  for (const molecule of molecules || []) {
    for (const atom of molecule.atoms || []) {
      if (!index.has(atom.name)) {
        index.set(atom.name, molecule);
      }
    }
  }

  return index;
}

function analyzeMoleculeConnections(analyzer, callerMol) {
  return (callerMol.atoms || []).flatMap(atom =>
    analyzeAtomConnections(analyzer, callerMol, atom)
  );
}

function analyzeAtomConnections(analyzer, callerMol, atom) {
  return (atom.calls || [])
    .map(call => analyzer.createConnection(callerMol, atom, call))
    .filter(Boolean);
}

export default ConnectionAnalyzer;
