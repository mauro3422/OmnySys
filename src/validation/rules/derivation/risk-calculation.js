/**
 * @fileoverview Risk Calculation Rule
 * 
 * Valida que el risk score de una molécula sea el máximo
 * de los risk scores de sus átomos.
 * 
 * Fórmula: molecule.riskScore === MAX(atom.archetype.severity)
 * 
 * @module validation/rules/derivation/risk-calculation
 */

import { ValidationRule } from '../../core/rule-registry.js';
import { ValidationResult } from '../../core/validation-result.js';

export const RiskCalculationRule = new ValidationRule({
  id: 'derivation.risk-calculation',
  name: 'Risk Score Calculation',
  description: 'Verifica que el risk score sea el máximo de las severidades atómicas',
  layer: 'derivation',
  invariant: true,
  appliesTo: ['molecule', 'file'],
  requires: ['riskScore', 'atoms'],
  fixable: true,
  
  async validate(entity, context) {
    const atoms = await resolveAtoms(entity, context);
    
    if (atoms.length === 0) {
      return ValidationResult.valid(entity.id || entity.path, 'riskScore', {
        message: 'No atoms - risk score is 0',
        details: { riskScore: 0 }
      });
    }
    
    // Calcular máximo esperado
    const severities = atoms.map(atom => {
      // Archetype puede estar en diferentes lugares
      const archetype = atom.archetype || atom.metadata?.archetype;
      return archetype?.severity || 0;
    });
    
    const expectedMax = Math.max(...severities);
    const actual = entity.riskScore || 0;
    
    if (actual !== expectedMax) {
      return ValidationResult.invalid(
        entity.id || entity.path,
        'riskScore',
        expectedMax,
        actual,
        {
          message: `Risk score mismatch: expected ${expectedMax} (max of atoms), got ${actual}`,
          details: {
            atomCount: atoms.length,
            atomSeverities: atoms.map(a => ({
              name: a.name || a.id,
              severity: a.archetype?.severity || a.metadata?.archetype?.severity || 0
            })),
            maxSeverity: expectedMax
          },
          fixable: true
        }
      );
    }
    
    return ValidationResult.valid(entity.id || entity.path, 'riskScore', {
      message: `Risk score verified: ${actual}`,
      details: {
        riskScore: actual,
        atomCount: atoms.length,
        maxSeverityAtom: atoms.find(a => (a.archetype?.severity || 0) === expectedMax)?.name
      }
    });
  },
  
  async fix(entity, context, validationResult) {
    const atoms = await resolveAtoms(entity, context);
    const severities = atoms.map(atom => {
      const archetype = atom.archetype || atom.metadata?.archetype;
      return archetype?.severity || 0;
    });
    return Math.max(...severities);
  }
});

async function resolveAtoms(entity, context) {
  const atoms = [];
  
  for (const atomRef of entity.atoms || entity.definitions || []) {
    const atomId = typeof atomRef === 'string' ? atomRef : atomRef.id || atomRef.name;
    
    let atom = context.atoms?.get(atomId);
    
    if (!atom && typeof atomRef === 'object') {
      atom = atomRef;
    }
    
    if (atom) {
      atoms.push(atom);
    }
  }
  
  return atoms;
}

export default RiskCalculationRule;
