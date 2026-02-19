/**
 * @fileoverview Complexity Calculation Rule
 * 
 * Valida que la complejidad total de una molécula sea la suma
 * de las complejidades de sus átomos.
 * 
 * Fórmula: molecule.totalComplexity === Σ(atom.complexity)
 * 
 * @module validation/rules/derivation/complexity-calculation
 */

import { ValidationRule } from '../../core/rules/index.js';
import { ValidationResult } from '../../core/results/index.js';

export const ComplexityCalculationRule = new ValidationRule({
  id: 'derivation.complexity-calculation',
  name: 'Complexity Calculation',
  description: 'Verifica que la complejidad total sea la suma de las complejidades atómicas',
  layer: 'derivation',
  invariant: true, // CRÍTICA: La derivación debe ser matemáticamente correcta
  appliesTo: ['molecule', 'file'],
  requires: ['totalComplexity', 'atoms'],
  fixable: true,
  
  async validate(entity, context) {
    // Obtener átomos referenciados
    const atoms = await resolveAtoms(entity, context);
    
    if (atoms.length === 0) {
      return ValidationResult.warning(
        entity.id || entity.path,
        'totalComplexity',
        'No atoms found for complexity calculation',
        { details: { atomRefs: entity.atoms } }
      );
    }
    
    // Calcular suma esperada
    const expectedSum = atoms.reduce((sum, atom) => {
      return sum + (atom.complexity || atom.metadata?.complexity || 0);
    }, 0);
    
    const actual = entity.totalComplexity;
    
    if (actual !== expectedSum) {
      return ValidationResult.invalid(
        entity.id || entity.path,
        'totalComplexity',
        expectedSum,
        actual,
        {
          message: `Complexity mismatch: expected ${expectedSum} (sum of atoms), got ${actual}`,
          details: {
            atomCount: atoms.length,
            atoms: atoms.map(a => ({ 
              id: a.id || a.name, 
              complexity: a.complexity || a.metadata?.complexity 
            }))
          },
          fixable: true
        }
      );
    }
    
    return ValidationResult.valid(entity.id || entity.path, 'totalComplexity', {
      message: `Complexity calculation verified: ${actual}`,
      details: {
        total: actual,
        atomCount: atoms.length,
        averagePerAtom: Math.round(actual / atoms.length * 100) / 100
      }
    });
  },
  
  async fix(entity, context, validationResult) {
    // Recalcular y retornar el valor correcto
    const atoms = await resolveAtoms(entity, context);
    const correctSum = atoms.reduce((sum, atom) => {
      return sum + (atom.complexity || atom.metadata?.complexity || 0);
    }, 0);
    
    return correctSum;
  }
});

/**
 * Resuelve las referencias a átomos
 */
async function resolveAtoms(entity, context) {
  const atoms = [];
  
  for (const atomRef of entity.atoms || []) {
    // atomRef puede ser string (id) o objeto
    const atomId = typeof atomRef === 'string' ? atomRef : atomRef.id;
    
    // Intentar obtener del contexto
    let atom = context.atoms?.get(atomId);
    
    // Si no está en caché, puede estar en las definiciones del archivo
    if (!atom && entity.definitions) {
      atom = entity.definitions.find(d => d.name === atomId || d.id === atomId);
    }
    
    if (atom) {
      atoms.push(atom);
    }
  }
  
  return atoms;
}

export default ComplexityCalculationRule;
