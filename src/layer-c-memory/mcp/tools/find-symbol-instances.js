/**
 * MCP Tool: find_symbol_instances
 * 
 * Encuentra todas las instancias de un símbolo (función/variable) en el proyecto,
 * detecta cuáles son duplicados, cuál se usa realmente, y advierte sobre conflictos.
 * 
 * Útil para:
 * - Evitar editar el archivo equivocado (como me pasó con purpose.js)
 * - Detectar código duplicado entre archivos
 * - Encontrar la implementación "real" vs copias sin usar
 */

import { getAllAtoms } from '#layer-c/storage/index.js';
import { readFile } from '#utils/file-reader.js';

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
 * Tool principal
 */
export async function find_symbol_instances(args, context) {
  const { symbolName, includeSimilar = false, projectPath } = args;
  
  if (!symbolName) {
    return {
      error: 'symbolName es requerido',
      usage: 'find_symbol_instances({ symbolName: "nombreFuncion" })'
    };
  }
  
  try {
    const atoms = await getAllAtoms(projectPath || context.projectPath);
    
    // 1. Encontrar todas las instancias
    const instances = findAllInstances(atoms, symbolName);
    
    if (instances.length === 0) {
      return {
        symbol: symbolName,
        found: false,
        message: `No se encontró ninguna función/variable llamada "${symbolName}"`,
        suggestion: 'Verifica el nombre o usa search_files para encontrar el nombre correcto'
      };
    }
    
    // 2. Analizar uso de cada instancia
    const usageMap = analyzeUsage(atoms, instances, symbolName);
    
    // 3. Detectar duplicados
    const duplicates = detectDuplicates(instances);
    
    // 4. Determinar primaria
    const primary = determinePrimary(instances, usageMap);
    
    // 5. Generar resultados detallados
    const instanceDetails = instances.map(instance => {
      const usage = usageMap.get(instance.filePath);
      const isPrimary = primary && instance.filePath === primary.filePath;
      const isDuplicate = duplicates.some(d => 
        d.instances.some(i => i.file === instance.filePath)
      );
      
      return {
        id: instance.id,
        file: instance.filePath,
        line: instance.line,
        isExported: instance.isExported,
        complexity: instance.complexity,
        linesOfCode: instance.linesOfCode,
        structuralHash: instance.dna?.structuralHash?.slice(0, 16) + '...',
        usage: {
          importedBy: usage?.imports?.length || 0,
          calledBy: usage?.calls?.length || 0,
          total: usage?.totalUsage || 0
        },
        status: isPrimary ? '✅ PRIMARY' : (usage?.totalUsage === 0 ? '⚠️ UNUSED' : 'ℹ️ ALT'),
        isPrimary,
        isUnused: usage?.totalUsage === 0,
        isDuplicate
      };
    }).sort((a, b) => b.usage.total - a.usage.total);
    
    // 6. Generar recomendaciones
    const recommendations = generateRecommendations(instances, primary, duplicates, usageMap);
    
    // 7. Detectar imports directos (leer archivos)
    const directImports = [];
    for (const instance of instances) {
      try {
        const content = await readFile(instance.filePath, { projectPath: context.projectPath });
        const lines = content.split('\n');
        const exportLine = lines.findIndex((line, idx) => 
          idx + 1 >= instance.line && 
          line.includes('export') && 
          line.includes(symbolName)
        );
        
        if (exportLine !== -1) {
          directImports.push({
            file: instance.filePath,
            line: exportLine + 1,
            snippet: lines[exportLine].trim().slice(0, 80)
          });
        }
      } catch (e) {
        // Ignorar errores de lectura
      }
    }
    
    return {
      symbol: symbolName,
      found: true,
      summary: {
        totalInstances: instances.length,
        primaryInstance: primary ? {
          file: primary.filePath,
          line: primary.line
        } : null,
        duplicateGroups: duplicates.length,
        unusedInstances: instanceDetails.filter(i => i.isUnused).length
      },
      instances: instanceDetails,
      duplicates: duplicates.map(d => ({
        hash: d.hash,
        count: d.count,
        files: d.instances.map(i => i.file)
      })),
      directImports,
      recommendations,
      action: primary ? {
        type: 'edit',
        file: primary.filePath,
        line: primary.line,
        message: `Editar esta instancia (usada ${usageMap.get(primary.filePath)?.totalUsage || 0} veces)`
      } : null
    };
    
  } catch (error) {
    return {
      error: error.message,
      stack: error.stack
    };
  }
}
