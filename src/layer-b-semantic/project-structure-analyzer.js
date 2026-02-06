/**
 * project-structure-analyzer.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-b-semantic/project-analyzer/
 * 
 * Nueva estructura:
 *   - constants.js                - SSOT: pesos, umbrales, configuraciones
 *   - utils/
 *     - cohesion-calculator.js    - Cálculo de cohesión entre archivos
 *     - cluster-detector.js       - Detección de clusters/subsistemas
 *     - orphan-detector.js        - Detección de archivos huérfanos
 *     - matrix-builder.js         - Construcción de matriz de cohesión
 *   - reports/
 *     - structure-report.js       - Generación de reportes
 *     - stats-calculator.js       - Cálculo de estadísticas
 *   - index.js                    - Facade API pública
 * 
 * @deprecated Use `import { ... } from './project-analyzer/index.js'` instead
 */

console.warn('⚠️  DEPRECATED: Importing from project-structure-analyzer.js');
console.warn('   Please update imports to: project-analyzer/index.js');

export * from './project-analyzer/index.js';
