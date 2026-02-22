/**
 * @fileoverview Object Parser - Parsea objetos literales
 */

/**
 * Extrae pares clave:assertion de un objeto literal simple como `{ valid: true, errors }`
 * @param {string} objStr - String del objeto literal
 * @returns {Array} - Array de campos con sus assertions
 */
export function extractObjectFields(objStr) {
  const fields = [];
  // Matchear pares key: value simples (sin anidado)
  const pairRegex = /(\w+)\s*:\s*(true|false|null|\d+|"[^"]{1,20}"|'[^']{1,20}')/g;
  let m;
  while ((m = pairRegex.exec(objStr)) !== null) {
    const [, key, val] = m;
    let assertion;
    if (val === 'true')  assertion = 'true';
    else if (val === 'false') assertion = 'false';
    else if (val === 'null')  assertion = 'null';
    else if (/^\d+$/.test(val)) assertion = val;
    else assertion = `expect.any(String)`;
    fields.push({ key, assertion });
  }
  return fields.slice(0, 3); // máximo 3 campos
}
