/**
 * @fileoverview Connection Analyzer
 * 
 * Analiza conexiones entre archivos de un módulo.
 * 
 * @module module-analyzer/analyzers/connection-analyzer
 * @version 1.0.0
 */

import path from 'path';

export class ConnectionAnalyzer {
  constructor(molecules) {
    this.molecules = molecules;
    this.moleculeByFile = new Map(molecules.map(m => [path.basename(m.filePath), m]));
  }

  analyze() {
    const connections = [];
    
    for (const callerMol of this.molecules) {
      for (const atom of callerMol.atoms || []) {
        for (const call of atom.calls || []) {
          const calleeMol = this.findCalleeInModule(call.name);
          
          if (calleeMol && calleeMol.filePath !== callerMol.filePath) {
            connections.push(this.createConnection(
              callerMol, atom, calleeMol, call
            ));
          }
        }
      }
    }
    
    return connections;
  }

  findCalleeInModule(functionName) {
    for (const mol of this.molecules) {
      if (mol.atoms?.some(a => a.name === functionName)) {
        return mol;
      }
    }
    return null;
  }

  createConnection(callerMol, callerAtom, calleeMol, call) {
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

export default ConnectionAnalyzer;
