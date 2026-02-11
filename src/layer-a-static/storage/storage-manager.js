import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Storage Manager - Gestiona el guardado particionado de datos de análisis
 *
 * Estructura de datos:
 * .omnysysdata/
 *   ├── index.json              (metadata + índice ligero)
 *   ├── files/
 *   │   └── {relative-path}/    (espejo de estructura del proyecto)
 *   │       └── file.json
 *   ├── connections/
 *   │   ├── shared-state.json
 *   │   └── event-listeners.json
 *   ├── risks/
 *   │   └── assessment.json
 *   └── cache.json              (cache de análisis)
 */

const DATA_DIR = '.omnysysdata';

/**
 * Calcula hash de un archivo para detectar cambios
 */
function calculateFileHash(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8);
}

/**
 * Crea la estructura de directorios de .omnysysdata/
 */
export async function createDataDirectory(rootPath) {
  const dataPath = path.join(rootPath, DATA_DIR);

  await fs.mkdir(dataPath, { recursive: true });
  await fs.mkdir(path.join(dataPath, 'files'), { recursive: true });
  await fs.mkdir(path.join(dataPath, 'connections'), { recursive: true });
  await fs.mkdir(path.join(dataPath, 'risks'), { recursive: true });

  return dataPath;
}

/**
 * Guarda metadata global del proyecto + índice de archivos
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} metadata - Metadata del análisis
 * @param {object} fileIndex - Índice de archivos analizados
 */
export async function saveMetadata(rootPath, metadata, fileIndex) {
  const dataPath = await createDataDirectory(rootPath);

  const indexData = {
    metadata: {
      ...metadata,
      analyzedAt: new Date().toISOString(),
      storageVersion: '1.0.0',
      storageFormat: 'partitioned'
    },
    fileIndex: fileIndex || {}
  };

  const indexPath = path.join(dataPath, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));

  return indexPath;
}

/**
 * Guarda el análisis completo de un archivo individual
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo (ej: 'src/UI.js')
 * @param {object} fileData - Datos completos del archivo
 */
export async function saveFileAnalysis(rootPath, filePath, fileData) {
  const dataPath = path.join(rootPath, DATA_DIR);

  // Crear estructura de directorios que refleja el proyecto
  const fileDir = path.dirname(filePath);
  const targetDir = path.join(dataPath, 'files', fileDir);
  await fs.mkdir(targetDir, { recursive: true });

  // Guardar archivo con nombre original + .json
  const fileName = path.basename(filePath);
  const targetPath = path.join(targetDir, `${fileName}.json`);

  // Verificar si existe análisis previo para preservar campos importantes
  let existingData = {};
  try {
    const existingContent = await fs.readFile(targetPath, 'utf-8');
    existingData = JSON.parse(existingContent);
  } catch {
    // No existe archivo previo, usar objeto vacío
  }

  // Merge: El nuevo análisis tiene prioridad, pero preservar campos importantes del anterior
  // si el nuevo NO los tiene (ej: análisis incremental sin LLM no debe borrar llmInsights previos)
  const mergedData = {
    ...existingData,
    ...fileData,
    // Si el nuevo análisis NO tiene llmInsights, preservar el existente
    llmInsights: fileData.llmInsights !== undefined ? fileData.llmInsights : existingData.llmInsights,
    // Si el nuevo análisis NO tiene riskScore, preservar el existente
    riskScore: fileData.riskScore !== undefined ? fileData.riskScore : existingData.riskScore,
    // Si el nuevo análisis NO tiene quality, preservar el existente
    quality: fileData.quality !== undefined ? fileData.quality : existingData.quality
  };

  await fs.writeFile(targetPath, JSON.stringify(mergedData, null, 2));

  return targetPath;
}

/**
 * Guarda todas las conexiones semánticas
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {array} sharedStateConnections - Conexiones de estado compartido
 * @param {array} eventListenerConnections - Conexiones de eventos
 */
export async function saveConnections(rootPath, sharedStateConnections, eventListenerConnections) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const connectionsDir = path.join(dataPath, 'connections');

  // Guardar shared state connections
  const sharedStatePath = path.join(connectionsDir, 'shared-state.json');
  await fs.writeFile(sharedStatePath, JSON.stringify({
    connections: sharedStateConnections,
    total: sharedStateConnections.length,
    generatedAt: new Date().toISOString()
  }, null, 2));

  // Guardar event listener connections
  const eventListenersPath = path.join(connectionsDir, 'event-listeners.json');
  await fs.writeFile(eventListenersPath, JSON.stringify({
    connections: eventListenerConnections,
    total: eventListenerConnections.length,
    generatedAt: new Date().toISOString()
  }, null, 2));

  return { sharedStatePath, eventListenersPath };
}

/**
 * Guarda el risk assessment completo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} riskAssessment - Risk assessment con scores y report
 */
export async function saveRiskAssessment(rootPath, riskAssessment) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const risksDir = path.join(dataPath, 'risks');

  const assessmentPath = path.join(risksDir, 'assessment.json');
  await fs.writeFile(assessmentPath, JSON.stringify({
    ...riskAssessment,
    generatedAt: new Date().toISOString()
  }, null, 2));

  return assessmentPath;
}

/**
 * Guarda el system map completo (particionado)
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} systemMap - Enhanced system map completo
 */
export async function savePartitionedSystemMap(rootPath, systemMap) {
  const savedPaths = {
    metadata: null,
    files: [],
    connections: null,
    risks: null
  };

  // 1. Crear file index (metadata ligera por archivo)
  const fileIndex = {};
  for (const [filePath, fileData] of Object.entries(systemMap.files || {})) {
    fileIndex[filePath] = {
      hash: calculateFileHash(filePath),
      exports: fileData.exports?.length || 0,
      imports: fileData.imports?.length || 0,
      semanticConnections: fileData.semanticConnections?.length || 0,
      riskLevel: fileData.riskScore?.severity || 'low',
      lastAnalyzed: new Date().toISOString()
    };
  }

  // 2. Guardar metadata + índice
  savedPaths.metadata = await saveMetadata(rootPath, systemMap.metadata, fileIndex);

  // 3. Guardar cada archivo individual
  for (const [filePath, fileData] of Object.entries(systemMap.files || {})) {
    const savedPath = await saveFileAnalysis(rootPath, filePath, fileData);
    savedPaths.files.push(savedPath);
  }

  // 4. Guardar conexiones
  savedPaths.connections = await saveConnections(
    rootPath,
    systemMap.connections?.sharedState || [],
    systemMap.connections?.eventListeners || []
  );

  // 5. Guardar risk assessment
  savedPaths.risks = await saveRiskAssessment(rootPath, systemMap.riskAssessment || {});

  return savedPaths;
}

/**
 * Obtiene la ruta del directorio .omnysysdata/
 */
export function getDataDirectory(rootPath) {
  return path.join(rootPath, DATA_DIR);
}

/**
 * Verifica si existe análisis previo
 */
export async function hasExistingAnalysis(rootPath) {
  try {
    const dataPath = getDataDirectory(rootPath);
    const indexPath = path.join(dataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda estructura molecular de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} molecularData - Estructura molecular (atoms + derivations)
 */
export async function saveMolecule(rootPath, filePath, molecularData) {
  const dataPath = path.join(rootPath, DATA_DIR);

  // Crear directorio molecules/ si no existe
  const moleculesDir = path.join(dataPath, 'molecules');
  await fs.mkdir(moleculesDir, { recursive: true });

  // Crear estructura de directorios que refleja el proyecto
  const fileDir = path.dirname(filePath);
  const targetDir = path.join(moleculesDir, fileDir);
  await fs.mkdir(targetDir, { recursive: true });

  // Guardar archivo con nombre original + .molecule.json
  const fileName = path.basename(filePath);
  const targetPath = path.join(targetDir, `${fileName}.molecule.json`);

  await fs.writeFile(targetPath, JSON.stringify(molecularData, null, 2));

  return targetPath;
}

/**
 * Carga estructura molecular de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {object|null} - Molecular data o null si no existe
 */
export async function loadMolecule(rootPath, filePath) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const moleculesDir = path.join(dataPath, 'molecules');

  // 🆕 FIX: Normalizar filePath para que sea relativo al rootPath
  let normalizedPath = filePath;
  // Normalizar separadores de path para comparación cross-platform
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');
  
  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath);
  const targetPath = path.join(moleculesDir, fileDir, `${fileName}.molecule.json`);

  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Guarda el análisis atómico de una función
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} functionName - Nombre de la función
 * @param {object} atomData - Metadata del átomo
 */
export async function saveAtom(rootPath, filePath, functionName, atomData) {
  const dataPath = path.join(rootPath, DATA_DIR);

  // Crear directorio atoms/ si no existe
  const atomsDir = path.join(dataPath, 'atoms');
  await fs.mkdir(atomsDir, { recursive: true });

  // Crear estructura: atoms/{filePath}/{functionName}.json
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const targetDir = path.join(atomsDir, fileDir, fileName);
  await fs.mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, `${functionName}.json`);

  await fs.writeFile(targetPath, JSON.stringify(atomData, null, 2));

  return targetPath;
}

/**
 * Carga todos los átomos de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {array} - Array de atoms
 */
export async function loadAtoms(rootPath, filePath) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const atomsDir = path.join(dataPath, 'atoms');

  // 🆕 FIX: Normalizar filePath para que sea relativo al rootPath
  let normalizedPath = filePath;
  // Normalizar separadores de path para comparación cross-platform
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');
  
  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath, path.extname(normalizedPath));
  const targetDir = path.join(atomsDir, fileDir, fileName);

  try {
    const files = await fs.readdir(targetDir);
    const atoms = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
        atoms.push(JSON.parse(content));
      }
    }

    return atoms;
  } catch {
    return [];
  }
}
