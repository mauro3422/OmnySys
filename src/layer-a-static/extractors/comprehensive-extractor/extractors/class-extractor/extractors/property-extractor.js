/**
 * @fileoverview Property Extractor
 * 
 * @module class-extractor/extractors/property-extractor
 */

/**
 * Extract class properties/fields
 * @param {string} classBody - Class body code
 * @returns {Array} Property definitions
 */
export function extractClassProperties(classBody) {
  if (!classBody) return [];
  
  const properties = [];
  
  // Public properties
  const propPattern = /(?:(static|readonly)\s+)?(?!constructor|if|while|for|switch)(\w+)\s*[:=]/g;
  let match;
  
  while ((match = propPattern.exec(classBody)) !== null) {
    const isStatic = match[1] === 'static';
    const isReadonly = match[1] === 'readonly';
    const name = match[2];
    
    // Skip method definitions
    if (classBody.slice(match.index + match[0].length).trim().startsWith('(')) continue;
    
    properties.push({
      name,
      isStatic,
      isReadonly,
      visibility: getPropertyVisibility(name),
      type: extractPropertyType(classBody, match.index + match[0].length)
    });
  }
  
  // TypeScript property declarations
  const tsPropPattern = /(?:(static|readonly|private|protected|public)\s+)*(\w+)\s*:\s*(\w+)/g;
  while ((match = tsPropPattern.exec(classBody)) !== null) {
    const modifiers = match[0].match(/(static|readonly|private|protected|public)/g) || [];
    
    properties.push({
      name: match[2],
      isStatic: modifiers.includes('static'),
      isReadonly: modifiers.includes('readonly'),
      visibility: getTSPropertyVisibility(modifiers, match[2]),
      type: match[3]
    });
  }
  
  // Remove duplicates
  return [...new Map(properties.map(p => [p.name, p])).values()];
}

/**
 * Get visibility for standard property
 */
function getPropertyVisibility(name) {
  if (name.startsWith('#')) return 'private';
  if (name.startsWith('_')) return 'protected';
  return 'public';
}

/**
 * Get visibility for TypeScript property
 */
function getTSPropertyVisibility(modifiers, name) {
  if (modifiers.includes('private') || name.startsWith('#')) return 'private';
  if (modifiers.includes('protected')) return 'protected';
  return 'public';
}

/**
 * Extract property type
 */
function extractPropertyType(classBody, startPos) {
  const afterColon = classBody.slice(startPos, startPos + 50);
  const typeMatch = afterColon.match(/^\s*(\w+|[{\[][^;]+[}\]]);/);
  return typeMatch ? typeMatch[1].trim() : null;
}
