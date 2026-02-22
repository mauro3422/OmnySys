/**
 * @fileoverview Risk Utils - Utilidades para manejo de riesgos
 */

/**
 * Convierte nivel de riesgo a orden numérico para sorting
 * @param {string} risk - Nivel de riesgo ('high', 'medium', 'low')
 * @returns {number} - Orden numérico (3=high, 2=medium, 1=low, 0=default)
 */
export function riskOrder(risk) {
  switch (risk) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}
