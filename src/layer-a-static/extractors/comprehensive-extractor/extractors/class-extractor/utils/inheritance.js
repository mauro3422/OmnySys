/**
 * @fileoverview inheritance.js
 * 
 * Inheritance analysis utilities
 * 
 * @module comprehensive-extractor/extractors/class-extractor/utils/inheritance
 */

/**
 * Extract class inheritance hierarchy
 * 
 * @param {Array} classes - Extracted classes
 * @returns {Object} - Inheritance tree
 */
export function extractInheritanceHierarchy(classes) {
  const hierarchy = {};
  
  classes.forEach(cls => {
    hierarchy[cls.name] = {
      extends: cls.superClass,
      implements: cls.implements || [],
      children: classes.filter(c => c.superClass === cls.name).map(c => c.name),
      depth: 0 // Will be calculated
    };
  });
  
  // Calculate depth for each class
  Object.keys(hierarchy).forEach(name => {
    hierarchy[name].depth = calculateDepth(hierarchy, name);
  });
  
  return hierarchy;
}

/**
 * Calculate inheritance depth across all classes
 */
export function calculateInheritanceDepth(classes) {
  let maxDepth = 0;
  
  classes.forEach(cls => {
    let depth = 0;
    let current = cls;
    
    while (current?.superClass) {
      depth++;
      current = classes.find(c => c.name === current.superClass);
    }
    
    maxDepth = Math.max(maxDepth, depth);
  });
  
  return maxDepth;
}

/**
 * Calculate depth of a specific class in hierarchy
 */
function calculateDepth(hierarchy, className, visited = new Set()) {
  if (visited.has(className)) return 0;
  visited.add(className);
  
  const cls = hierarchy[className];
  if (!cls || !cls.extends) return 0;
  
  return 1 + calculateDepth(hierarchy, cls.extends, visited);
}

/**
 * Extract mixins used by classes
 * 
 * @param {string} code - Source code
 * @returns {Array} - Mixin applications
 */
export function extractMixins(code) {
  const mixins = [];
  
  // Mixin pattern: class X extends Mixin(Y) or class X extends MixinA(MixinB(Base))
  const mixinPattern = /class\s+(\w+)\s+extends\s+(\w+)\s*\(\s*(\w+)\s*\)/g;
  let match;
  
  while ((match = mixinPattern.exec(code)) !== null) {
    mixins.push({
      className: match[1],
      mixin: match[2],
      baseClass: match[3]
    });
  }
  
  return mixins;
}
