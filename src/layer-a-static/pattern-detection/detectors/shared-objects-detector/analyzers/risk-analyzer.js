/**
 * @fileoverview risk-analyzer.js
 * 
 * Risk profile analysis
 * 
 * @module pattern-detection/detectors/shared-objects-detector/analyzers/risk-analyzer
 */

/**
 * Analiza el perfil de riesgo de un objeto
 */
export function analyzeRiskProfile(obj, usages, filePath, config) {
  const factors = [];
  let score = 0;
  let type = 'unknown';
  
  // === HEURÍSTICA 0: Usar metadatos del extractor ===
  if (obj.objectType && obj.riskLevel) {
    switch (obj.objectType) {
      case 'enum':
        score -= 30;
        type = 'enum';
        factors.push('extractor:enum');
        break;
      case 'state':
        score += 40;
        type = 'state';
        factors.push('extractor:state');
        break;
      case 'data_structure':
        score += 5;
        type = 'data_structure';
        factors.push('extractor:data_structure');
        break;
      case 'mixed':
        score += 15;
        type = 'mixed';
        factors.push('extractor:mixed');
        break;
    }
    
    if (obj.riskLevel === 'low') {
      score = Math.min(score, 10);
    } else if (obj.riskLevel === 'high') {
      score = Math.max(score, 40);
    }
  }
  
  // === HEURÍSTICA 1: Nombre sugiere CONFIG ===
  const isConfig = isConfigObject(obj.name, config);
  if (isConfig) {
    score -= 25;
    if (type === 'unknown') type = 'config';
    factors.push('naming:config');
  }
  
  // === HEURÍSTICA 2: Nombre sugiere STATE ===
  const isState = isStateObject(obj.name, obj, filePath, config);
  if (isState) {
    score += 35;
    if (type === 'unknown') type = 'state';
    factors.push('naming:state');
  }
  
  // === HEURÍSTICA 3: Nombre sugiere UTILS ===
  const isUtils = isUtilsObject(obj.name);
  if (isUtils) {
    score -= 15;
    if (type === 'unknown') type = 'utils';
    factors.push('naming:utils');
  }
  
  // === HEURÍSTICA 4: Detalles de propiedades ===
  if (obj.propertyDetails && Array.isArray(obj.propertyDetails)) {
    const highRiskProps = obj.propertyDetails.filter(p => p.risk === 'high').length;
    const lowRiskProps = obj.propertyDetails.filter(p => p.risk === 'low').length;
    
    if (highRiskProps > 0) {
      score += highRiskProps * 10;
      factors.push(`properties:functions:${highRiskProps}`);
    }
    
    if (lowRiskProps > 0 && highRiskProps === 0) {
      score -= 20;
      if (type === 'unknown') type = 'enum';
      factors.push('properties:only_literals');
    }
  }
  
  // === HEURÍSTICA 5: Es mutable ===
  if (obj.isMutable) {
    if (type !== 'enum' && type !== 'config') {
      score += 15;
      factors.push('parser:mutable');
    }
  } else {
    score -= 10;
    factors.push('parser:immutable');
  }
  
  // === HEURÍSTICA 6: Cantidad de usos ===
  const isLowRiskType = type === 'enum' || type === 'config';
  
  if (usages.length >= 10) {
    if (!isLowRiskType) {
      score += 20;
      factors.push('usage:high');
    } else {
      score -= 5;
      factors.push('usage:high_but_enum');
    }
  } else if (usages.length >= 5) {
    if (!isLowRiskType) {
      score += 10;
      factors.push('usage:medium');
    }
  }
  
  // === HEURÍSTICA 7: Ubicación del archivo ===
  if (filePath && /config\/(change-)?types|config\/constants|types\.js$/i.test(filePath)) {
    score -= 15;
    factors.push('location:config_file');
  }
  
  // Determinar tipo final
  if (type === 'unknown') {
    if (score > 20) type = 'potential_state';
    else if (score < -10) type = 'likely_config';
    else type = 'neutral';
  }
  
  return {
    score: Math.max(0, score),
    type,
    factors
  };
}

function isConfigObject(name, config) {
  const patterns = config?.configPatterns || [
    /^CONFIG$/i, /^SETTINGS$/i, /^OPTIONS$/i,
    /^DEFAULTS$/i, /^CONSTANTS$/i, /^ENV$/i,
    /^CFG$/i, /^CONF$/i
  ];
  return patterns.some(p => p.test(name));
}

function isStateObject(name, obj, filePath, config) {
  const patterns = config?.statePatterns || [
    /store$/i, /state$/i, /manager$/i,
    /cache$/i, /registry$/i, /pool$/i, /queue$/i,
    /buffer$/i, /stack$/i, /heap$/i,
    /global$/i, /shared$/i, /mutable$/i,
    /context$/i, /provider$/i
  ];
  
  const matchesPattern = patterns.some(p => p.test(name));
  
  if (!matchesPattern) return false;
  
  const isInTypesFile = filePath && (
    /config\/(change-)?types/i.test(filePath) ||
    /config\/constants/i.test(filePath) ||
    /types\.js$/i.test(filePath)
  );
  
  if (isInTypesFile) {
    return false;
  }
  
  return true;
}

function isUtilsObject(name) {
  const patterns = [
    /utils?$/i, /helpers?$/i, /tools?$/i,
    /lib$/i, /library$/i, /common$/i,
    /shared\/utils/i
  ];
  return patterns.some(p => p.test(name));
}
