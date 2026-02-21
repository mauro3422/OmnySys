/**
 * Instance helper utilities
 * @module layer-c-memory/mcp/tools/find-symbol-instances/instance-helper
 */

/**
 * Determina si un call es a una instancia específica
 * @param {Object} callerAtom - Atom that makes the call
 * @param {Object} targetInstance - Target instance
 * @param {string} symbolName - Symbol name
 * @returns {boolean} - True if call is to this instance
 */
export function isCallToInstance(callerAtom, targetInstance, symbolName) {
  if (callerAtom.imports) {
    for (const imp of callerAtom.imports) {
      if (imp.source && targetInstance.filePath.includes(imp.source.replace('.js', ''))) {
        return true;
      }
    }
  }
  
  if (callerAtom.filePath === targetInstance.filePath) {
    return true;
  }
  
  return false;
}

/**
 * Determina cuál es la instancia primaria (más usada)
 * @param {Array} instances - Array of instances
 * @param {Map} usageMap - Map of filePath to usage info
 * @returns {Object|null} - Primary instance or null
 */
export function determinePrimary(instances, usageMap) {
  let primary = null;
  let maxUsage = -1;
  
  for (const instance of instances) {
    const usage = usageMap.get(instance.filePath);
    if (usage && usage.totalUsage > maxUsage) {
      maxUsage = usage.totalUsage;
      primary = instance;
    }
  }
  
  return primary;
}
