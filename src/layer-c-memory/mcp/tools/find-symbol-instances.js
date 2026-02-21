/**
 * MCP Tool: find_symbol_instances
 * 
 * Encuentra todas las instancias de un símbolo (función/variable) en el proyecto,
 * detecta cuáles son duplicados, cuál se usa realmente, y advierte sobre conflictos.
 * 
 * También incluye modo auto-detección que escanea TODO el proyecto buscando duplicados
 * sin necesidad de especificar un nombre. Ideal para encontrar deuda técnica oculta.
 * 
 * Útil para:
 * - Evitar editar el archivo equivocado (como me pasó con purpose.js)
 * - Detectar código duplicado entre archivos
 * - Encontrar la implementación "real" vs copias sin usar
 * - Priorizar refactorización de duplicados críticos
 * 
 * Modos de uso:
 * 1. Búsqueda específica: { symbolName: "detectAtomPurpose" }
 * 2. Auto-detección: { autoDetect: true } - escanea todos los duplicados
 */

import { getAllAtoms } from '#layer-c/storage/index.js';

/**
 * Busca todas las instancias de un símbolo por nombre
 */
function findAllInstances(atoms, symbolName) {
  return atoms.filter(atom => atom.name === symbolName);
}

/**
 * Analiza quién importa/us cada instancia
 */
function analyzeUsage(atoms, instances, symbolName) {
  const usageMap = new Map();
  
  for (const instance of instances) {
    const filePath = instance.filePath;
    usageMap.set(filePath, {
      imports: [],
      calls: [],
      totalUsage: 0
    });
    
    // Buscar quién importa este archivo
    for (const atom of atoms) {
      if (atom.imports) {
        for (const imp of atom.imports) {
          if (imp.source && imp.source.includes(filePath.replace('.js', ''))) {
            usageMap.get(filePath).imports.push({
              file: atom.filePath,
              atom: atom.name
            });
          }
        }
      }
      
      // Buscar quién llama a esta función
      if (atom.calls) {
        for (const call of atom.calls) {
          const callName = typeof call === 'string' ? call : call.name;
          if (callName === symbolName) {
            // Verificar si este call es al archivo correcto
            // (evitar confundir con otra función del mismo nombre en otro archivo)
            if (isCallToInstance(atom, instance, symbolName)) {
              usageMap.get(filePath).calls.push({
                file: atom.filePath,
                atom: atom.name,
                line: call.line || 0
              });
            }
          }
        }
      }
    }
    
    const usage = usageMap.get(filePath);
    usage.totalUsage = usage.imports.length + usage.calls.length;
  }
  
  return usageMap;
}

/**
 * Determina si un call es a una instancia específica
 * (heurística: verifica imports del caller)
 */
function isCallToInstance(callerAtom, targetInstance, symbolName) {
  // Si el caller importa el archivo de la instancia, es muy probable que sea a esa
  if (callerAtom.imports) {
    for (const imp of callerAtom.imports) {
      if (imp.source && targetInstance.filePath.includes(imp.source.replace('.js', ''))) {
        return true;
      }
    }
  }
  
  // Si el caller está en el mismo archivo, definitivamente es a esa instancia
  if (callerAtom.filePath === targetInstance.filePath) {
    return true;
  }
  
  return false;
}

/**
 * Detecta si hay duplicados exactos o similares entre instancias
 */
function detectDuplicates(instances) {
  const hashes = new Map();
  const duplicates = [];
  
  for (const instance of instances) {
    const hash = instance.dna?.structuralHash;
    if (!hash) continue;
    
    if (!hashes.has(hash)) {
      hashes.set(hash, []);
    }
    hashes.get(hash).push(instance);
  }
  
  for (const [hash, atoms] of hashes) {
    if (atoms.length > 1) {
      duplicates.push({
        hash,
        count: atoms.length,
        instances: atoms.map(a => ({
          file: a.filePath,
          line: a.line,
          complexity: a.complexity,
          linesOfCode: a.linesOfCode
        }))
      });
    }
  }
  
  return duplicates;
}

/**
 * Determina cuál es la instancia primaria (más usada)
 */
function determinePrimary(instances, usageMap) {
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

/**
 * Genera recomendaciones basadas en el análisis
 */
function generateRecommendations(instances, primary, duplicates, usageMap) {
  const recommendations = [];
  
  if (instances.length === 0) {
    recommendations.push({
      type: 'error',
      message: `No se encontró ninguna instancia de "${instances[0]?.name || 'el símbolo'}"`
    });
    return recommendations;
  }
  
  if (instances.length === 1) {
    recommendations.push({
      type: 'info',
      message: 'Solo existe una instancia. Editar esta es seguro.'
    });
    return recommendations;
  }
  
  if (duplicates.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `Se encontraron ${duplicates.length} grupos de duplicados exactos. Considera consolidar en un solo archivo.`,
      action: 'review_duplicates'
    });
  }
  
  const unused = instances.filter(i => {
    const usage = usageMap.get(i.filePath);
    return !usage || usage.totalUsage === 0;
  });
  
  if (unused.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${unused.length} instancia(s) no se usa(n) en el proyecto. Podrían eliminarse.`,
      files: unused.map(i => i.filePath),
      action: 'consider_removal'
    });
  }
  
  if (primary) {
    recommendations.push({
      type: 'success',
      message: `Instancia primaria identificada: ${primary.filePath}`,
      action: 'edit_this_file'
    });
  }
  
  return recommendations;
}

/**
 * Auto-detecta duplicados críticos en todo el proyecto
 * Escanea todos los átomos buscando funciones duplicadas que deberían unificarse
 */
async function autoDetectDuplicates(atoms, minInstances = 2) {
  // Agrupar por hash estructural (código idéntico)
  const byHash = new Map();
  
  for (const atom of atoms) {
    // Solo considerar funciones con nombre y exportadas
    if (!atom.name || atom.name === 'anonymous') continue;
    if (atom.linesOfCode < 5) continue; // Ignorar funciones muy pequeñas
    
    const hash = atom.dna?.structuralHash;
    if (!hash) continue;
    
    if (!byHash.has(hash)) {
      byHash.set(hash, []);
    }
    byHash.get(hash).push(atom);
  }
  
  // Encontrar grupos con múltiples instancias
  const duplicates = [];
  for (const [hash, atomsList] of byHash) {
    if (atomsList.length >= minInstances) {
      // Calcular score de riesgo para este duplicado
      const totalUsage = atomsList.reduce((sum, a) => sum + (a.calledBy?.length || 0), 0);
      const maxComplexity = Math.max(...atomsList.map(a => a.complexity || 0));
      const totalLines = atomsList.reduce((sum, a) => sum + (a.linesOfCode || 0), 0);
      
      // Score: cuanto más se usa y más grande, más crítico
      const riskScore = (totalUsage * 2) + (maxComplexity * 3) + (totalLines / 10);
      
      // Determinar cuál es la instancia "canónica" (la más usada o la de src/)
      const canonical = atomsList.sort((a, b) => {
        const usageA = a.calledBy?.length || 0;
        const usageB = b.calledBy?.length || 0;
        // Priorizar: 1) Más usada, 2) En src/ (no scripts/), 3) Menor complejidad
        if (usageB !== usageA) return usageB - usageA;
        if (a.filePath?.startsWith('src/') && !b.filePath?.startsWith('src/')) return -1;
        if (!a.filePath?.startsWith('src/') && b.filePath?.startsWith('src/')) return 1;
        return (a.complexity || 0) - (b.complexity || 0);
      })[0];
      
      // Get all unique names in this duplicate group
      const uniqueNames = [...new Set(atomsList.map(a => a.name))];
      const displayName = uniqueNames.length === 1 
        ? `"${uniqueNames[0]}"`
        : `${uniqueNames.length} funciones con código idéntico`;
      
      duplicates.push({
        hash: hash.slice(0, 16) + '...',
        symbolName: atomsList[0].name,
        allNames: uniqueNames,
        count: atomsList.length,
        riskScore: Math.round(riskScore),
        totalUsage,
        potentialSavings: (atomsList.length - 1) * (atomsList[0].linesOfCode || 0),
        linesOfCode: atomsList[0].linesOfCode,
        canonical: {
          file: canonical.filePath,
          line: canonical.line,
          usage: canonical.calledBy?.length || 0,
          name: canonical.name
        },
        instances: atomsList.map(a => ({
          file: a.filePath,
          line: a.line,
          name: a.name,
          usage: a.calledBy?.length || 0,
          complexity: a.complexity,
          isCanonical: a.id === canonical.id
        })).sort((a, b) => b.usage - a.usage),
        recommendation: atomsList.length > 2 
          ? `CRÍTICO: ${atomsList.length} copias idénticas (${uniqueNames.join(', ')}). Consolidar en ${canonical.filePath}`
          : `Duplicado: Código idéntico en ${atomsList.length} archivos (${uniqueNames.join(', ')}). Usar la versión de ${canonical.filePath}`
      });
    }
  }
  
  // Ordenar por riesgo (más críticos primero)
  return duplicates.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
}

// ── Branch helpers for find_symbol_instances ─────────────────────────────────

async function handleAutoDetect(resolvedPath) {
  const atoms = await getAllAtoms(resolvedPath);
  const duplicates = await autoDetectDuplicates(atoms);
  const criticalCount = duplicates.filter(d => d.count > 2).length;
  const totalSavings = duplicates.reduce((sum, d) => sum + d.potentialSavings, 0);
  return {
    mode: 'auto_detect',
    summary: { totalDuplicatesFound: duplicates.length, criticalDuplicates: criticalCount, totalInstances: duplicates.reduce((sum, d) => sum + d.count, 0), potentialSavingsLOC: totalSavings },
    duplicates: duplicates.map(d => ({ primaryName: d.symbolName, allNames: d.allNames, count: d.count, linesOfCode: d.linesOfCode, riskScore: d.riskScore, canonical: d.canonical, instances: d.instances, recommendation: d.recommendation })),
    topPriority: duplicates.slice(0, 5).map(d => ({ symbol: d.symbolName, action: `Consolidar ${d.count} copias en ${d.canonical.file}`, savings: `${d.potentialSavings} LOC` })),
    recommendations: [
      { type: 'info', message: `Se encontraron ${duplicates.length} grupos de funciones duplicadas`, action: 'review_top_5' },
      ...(criticalCount > 0 ? [{ type: 'warning', message: `${criticalCount} duplicados tienen más de 2 copias - prioridad alta`, action: 'address_critical_first' }] : [])
    ]
  };
}

function buildInstanceDetails(instances, usageMap, primary, duplicates) {
  return instances.map(instance => {
    const usage = usageMap.get(instance.filePath);
    const isPrimary = primary && instance.filePath === primary.filePath;
    const isDuplicate = duplicates.some(d => d.instances.some(i => i.file === instance.filePath));
    return {
      id: instance.id, file: instance.filePath, line: instance.line,
      isExported: instance.isExported, complexity: instance.complexity, linesOfCode: instance.linesOfCode,
      structuralHash: instance.dna?.structuralHash?.slice(0, 16) + '...',
      usage: { importedBy: usage?.imports?.length || 0, calledBy: usage?.calls?.length || 0, total: usage?.totalUsage || 0 },
      status: isPrimary ? '✅ PRIMARY' : (usage?.totalUsage === 0 ? '⚠️ UNUSED' : 'ℹ️ ALT'),
      isPrimary, isUnused: usage?.totalUsage === 0, isDuplicate
    };
  }).sort((a, b) => b.usage.total - a.usage.total);
}

async function handleSymbolSearch(symbolName, resolvedPath) {
  const atoms = await getAllAtoms(resolvedPath);
  const instances = findAllInstances(atoms, symbolName);
  if (instances.length === 0) {
    return { symbol: symbolName, found: false, message: `No se encontró ninguna función/variable llamada "${symbolName}"`, suggestion: 'Verifica el nombre o usa search_files para encontrar el nombre correcto' };
  }
  const usageMap = analyzeUsage(atoms, instances, symbolName);
  const duplicates = detectDuplicates(instances);
  const primary = determinePrimary(instances, usageMap);
  const instanceDetails = buildInstanceDetails(instances, usageMap, primary, duplicates);
  return {
    symbol: symbolName, found: true,
    summary: { totalInstances: instances.length, primaryInstance: primary ? { file: primary.filePath, line: primary.line } : null, duplicateGroups: duplicates.length, unusedInstances: instanceDetails.filter(i => i.isUnused).length },
    instances: instanceDetails,
    duplicates: duplicates.map(d => ({ hash: d.hash, count: d.count, files: d.instances.map(i => i.file) })),
    directImports: [],
    recommendations: generateRecommendations(instances, primary, duplicates, usageMap),
    action: primary ? { type: 'edit', file: primary.filePath, line: primary.line, message: `Editar esta instancia (usada ${usageMap.get(primary.filePath)?.totalUsage || 0} veces)` } : null
  };
}

/**
 * Tool principal
 */
export async function find_symbol_instances(args, context) {
  const { symbolName, autoDetect = false, projectPath } = args;
  const resolvedPath = projectPath || context.projectPath;
  try {
    if (autoDetect || !symbolName) return await handleAutoDetect(resolvedPath);
    return await handleSymbolSearch(symbolName, resolvedPath);
  } catch (error) {
    return { error: error.message, stack: error.stack };
  }
}
