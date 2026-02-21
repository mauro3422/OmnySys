/**
 * @fileoverview Placeholder Restorer - Lógica de restauración de placeholders
 * 
 * Este módulo maneja la restauración de valores originales en strings y nodos.
 * 
 * @module preprocessor/experimental/placeholder-restorer
 * @experimental
 */

/**
 * Restaura placeholders dentro de un string
 * @param {Object} node - Nodo del AST
 * @param {string} key - Propiedad del nodo
 * @param {string} value - Valor actual (con placeholders)
 * @param {Map} placeholderMap - Mapa de placeholders
 * @param {Array} restorations - Registro de restauraciones
 * @returns {boolean} - true si se realizó alguna restauración
 */
export function restoreInString(node, key, value, placeholderMap, restorations) {
  let restored = false;
  
  // Buscar placeholders de shebang
  if (value.includes('__OMNY_SHEBANG__')) {
    const t = placeholderMap.get('__OMNY_SHEBANG__');
    if (t) {
      const newValue = value.replace('__OMNY_SHEBANG__', t.original);
      restorations.push({
        node,
        key,
        from: value,
        to: newValue
      });
      node[key] = newValue;
      restored = true;
    }
  }
  
  // Buscar placeholders de private fields
  const privateMatch = value.match(/__OMNY_PRIVATE_(\w+)__/);
  if (privateMatch) {
    const placeholder = `__OMNY_PRIVATE_${privateMatch[1]}__`;
    const t = placeholderMap.get(placeholder);
    if (t) {
      const newValue = value.replace(placeholder, t.original);
      restorations.push({
        node,
        key,
        from: value,
        to: newValue
      });
      node[key] = newValue;
      restored = true;
    }
  }
  
  // Buscar placeholders de private field access
  const privateAccessMatch = value.match(/__OMNY_PRIVATE_ACCESS_(\w+)__/);
  if (privateAccessMatch) {
    const placeholder = `__OMNY_PRIVATE_ACCESS_${privateAccessMatch[1]}__`;
    const t = placeholderMap.get(placeholder);
    if (t) {
      const newValue = value.replace(placeholder, t.original);
      restorations.push({
        node,
        key,
        from: value,
        to: newValue
      });
      node[key] = newValue;
      restored = true;
    }
  }
  
  return restored;
}

/**
 * Restaura PrivateName nodes específicamente
 * 
 * Babel representa private fields como:
 * { type: "PrivateName", id: { type: "Identifier", name: "__OMNY_PRIVATE_field__" } }
 * 
 * @param {Object} node - Nodo del AST
 * @param {Map} placeholderMap - Mapa de placeholders
 * @param {Array} restorations - Registro de restauraciones
 * @returns {boolean} - true si se realizó alguna restauración
 */
export function restorePrivateName(node, placeholderMap, restorations) {
  if (node.type !== 'PrivateName' || !node.id) {
    return false;
  }
  
  const name = node.id.name;
  
  // Buscar placeholder en el nombre
  const match = name.match(/__OMNY_PRIVATE_(\w+)__/);
  if (match) {
    const originalName = match[1];
    const t = placeholderMap.get(`__OMNY_PRIVATE_${originalName}__`);
    
    if (t) {
      node.id.name = originalName;
      restorations.push({
        node,
        key: 'id.name',
        from: name,
        to: originalName
      });
      return true;
    }
  }
  
  return false;
}

/**
 * Crea mapa de placeholders para búsqueda O(1)
 * @param {Array} transformations - Transformaciones del preprocesador
 * @returns {Map<string, Object>} - Mapa de placeholders
 */
export function createPlaceholderMap(transformations) {
  const map = new Map();
  
  for (const t of transformations) {
    map.set(t.placeholder, t);
    
    // También indexar por tipo para búsquedas especializadas
    if (!map.has(t.type)) {
      map.set(`__TYPE_${t.type}__`, []);
    }
    map.get(`__TYPE_${t.type}__`).push(t);
  }
  
  return map;
}
