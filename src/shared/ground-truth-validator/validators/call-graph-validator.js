/**
 * @fileoverview Call Graph Validator
 * 
 * Valida que el grafo de llamadas sea consistente.
 * 
 * @module ground-truth-validator/validators/call-graph-validator
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseValidator } from './base-validator.js';
import { safeReadJson } from '../../../utils/json-safe.js';
import { createLogger } from '../../logger-system.js';

const logger = createLogger('OmnySys:validator:call-graph');

export class CallGraphValidator extends BaseValidator {
  constructor() {
    super('call-graph-validator');
  }

  async validate(context) {
    const result = {
      phase: 'call-graph',
      valid: true,
      stats: { callsVerified: 0, missingBackRefs: 0 },
      mismatches: []
    };

    const atoms = await context.getAllAtoms();
    
    for (const [atomId, atom] of atoms) {
      if (!atom.calls) continue;
      
      for (const call of atom.calls) {
        result.stats.callsVerified++;
        const callName = typeof call === 'string' ? call : call.name;
        
        // Buscar átomo destino
        let found = false;
        for (const [id, target] of atoms) {
          if (target.name === callName) {
            found = true;
            
            // Verificar back-reference
            const hasBackRef = target.calledBy?.some(ref => {
              const refName = typeof ref === 'string' ? ref : ref.name;
              return refName === atom.name || refName === atom.id;
            });
            
            if (!hasBackRef) {
              result.stats.missingBackRefs++;
              result.mismatches.push({
                type: 'MISSING_BACK_REFERENCE',
                caller: atom.name,
                callee: callName
              });
            }
            break;
          }
        }
        
        if (!found && !this.isExternal(callName)) {
          result.mismatches.push({
            type: 'UNRESOLVED_CALL',
            caller: atom.name,
            callee: callName
          });
        }
      }
    }

    result.valid = result.mismatches.length === 0;
    return result;
  }

  isExternal(name) {
    const externals = [
      'console', 'Math', 'JSON', 'Object', 'Array', 'Promise',
      'setTimeout', 'fetch', 'require', 'process'
    ];
    return externals.includes(name) || name.startsWith('console.');
  }
}

export default CallGraphValidator;
