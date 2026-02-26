/**
 * @fileoverview Análisis de violaciones SOLID para monolitos
 */

/**
 * Analiza violaciones de SOLID en el archivo
 */
export function analyzeSOLIDViolations(fileData) {
  const violations = {
    SRP: null,
    OCP: null,
    LSP: null,
    ISP: null,
    DIP: null
  };
  
  const { operations, atoms } = fileData;
  
  if (operations.size > 5) {
    violations.SRP = {
      issue: `${operations.size} operaciones técnicas distintas en un solo archivo`,
      recommendation: 'Separar en módulos por responsabilidad técnica (save, load, transform, etc.)'
    };
  }
  
  if (atoms.length > 10) {
    const exportedFunctions = atoms.filter(a => a.isExported).length;
    if (exportedFunctions > 8) {
      violations.OCP = {
        issue: `${exportedFunctions} funciones exportadas - probable violacion de OCP`,
        recommendation: 'Considerar patrones de extensión en lugar de modificación'
      };
    }
  }
  
  if (fileData.archetypes.size > 3) {
    const types = Array.from(fileData.archetypes.keys());
    violations.ISP = {
      issue: `${types.length} tipos de comportamiento distintos`,
      recommendation: 'Separar en módulos más pequeños y específicos'
    };
  }
  
  if (atoms.some(a => a.calls?.length > 5)) {
    violations.DIP = {
      issue: 'Múltiples dependencias externas - verificar si depende de abstracciones',
      recommendation: 'Revisar que las dependencias sean a través de abstracciones, no concreciones'
    };
  }
  
  return violations;
}
