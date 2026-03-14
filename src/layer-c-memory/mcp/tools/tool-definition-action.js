import { PAGINATION_SCHEMA } from '../core/pagination.js';

export const actionToolDefinitions = [
  {
    name: 'mcp_omnysystem_atomic_edit',
    description: 'Edits a file with atomic validation - validates syntax, propagates vibration to dependents, and prevents breaking changes. Use this instead of normal edit for safer code changes.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file to edit' },
        oldString: { type: 'string', description: 'Text to be replaced' },
        newString: { type: 'string', description: 'New text to insert' },
        autoFix: { type: 'boolean', description: 'Si es true, intenta arreglar automáticamente las firmas de las funciones que dependen de este átomo tras la edición.', default: false }
      },
      required: ['filePath', 'oldString', 'newString']
    }
  },
  {
    name: 'mcp_omnysystem_atomic_write',
    description: 'Writes a new file with atomic validation - validates syntax before writing and immediately indexes the atom.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the new file' },
        content: { type: 'string', description: 'Full content of the file' },
        autoFix: { type: 'boolean', description: 'Si es true, intenta resolver conflictos de exportación automáticamente si el archivo tiene duplicados.', default: false },
        failOnDuplicate: { type: 'boolean', description: 'Si es true, falla la operación cuando detecta símbolos potencialmente duplicados en el proyecto.', default: false }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'mcp_omnysystem_move_file',
    description: 'Mueve un archivo físicamente y actualiza todas sus referencias (imports) en el resto del proyecto de forma atómica y segura.',
    inputSchema: {
      type: 'object',
      properties: {
        oldPath: { type: 'string', description: 'Ruta actual del archivo (relativa al proyecto)' },
        newPath: { type: 'string', description: 'Nueva ruta del archivo (relativa al proyecto)' }
      },
      required: ['oldPath', 'newPath']
    }
  },
  {
    name: 'mcp_omnysystem_fix_imports',
    description: 'Resuelve automáticamente los imports rotos en un archivo buscando los símbolos en el grafo global del proyecto.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path del archivo a reparar' },
        execute: { type: 'boolean', description: 'Si es true, aplica los cambios atómicamente. Si es false (default), solo devuelve las sugerencias de reparación.', default: false }
      },
      required: ['filePath']
    }
  },
  {
    name: 'mcp_omnysystem_execute_solid_split',
    description: 'Analiza una función compleja y genera una propuesta de división SOLID. Permite previsualizar los cambios antes de aplicarlos.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path del archivo contenedor' },
        symbolName: { type: 'string', description: 'Nombre de la función a dividir' },
        execute: { type: 'boolean', description: 'Si es true, aplica los cambios atómicamente. Si es false (default), solo devuelve la propuesta.', default: false }
      },
      required: ['filePath', 'symbolName']
    }
  },
  {
    name: 'mcp_omnysystem_suggest_refactoring',
    description: 'Analyzes code and suggests specific refactoring improvements: extract functions, rename variables, add error handling, optimize performance, split large files, and improve cohesion',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: filter by specific file path' },
        severity: { type: 'string', enum: ['all', 'high', 'medium', 'low'], default: 'all', description: 'Filter suggestions by severity' },
        limit: { type: 'number', description: 'Maximum suggestions to return', default: 20 },
        ...PAGINATION_SCHEMA
      }
    }
  },
  {
    name: 'mcp_omnysystem_suggest_architecture',
    description: 'Refactorización Arquitectónica/DDD (Domain-Driven Design). Lee las sociedades de código (funcionales) descubiertas por OmnySys y sugiere reagrupar archivos altamente cohesivos que se encuentren dispersos por el proyecto.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10, description: 'Máximo número de dominios sugeridos a devolver.' },
        confidenceThreshold: { type: 'number', default: 0.5, description: 'Penalidad de confianza en la cohesión (0.0 a 1.0).' }
      }
    }
  },
  {
    name: 'mcp_omnysystem_validate_imports',
    description: 'Validates imports in files: detects broken imports, unused imports, circular dependencies, and non-existent modules.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Optional: validate specific file only' },
        checkUnused: { type: 'boolean', default: true },
        checkBroken: { type: 'boolean', default: true },
        checkCircular: { type: 'boolean', default: false },
        checkFileExistence: { type: 'boolean', default: false },
        excludePaths: { type: 'array', items: { type: 'string' } },
        ...PAGINATION_SCHEMA
      }
    }
  },
  {
    name: 'mcp_omnysystem_generate_tests',
    description: 'Analyzes functions/classes and suggests tests. Action "analyze" or "generate".',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        functionName: { type: 'string' },
        action: { type: 'string', enum: ['analyze', 'generate'], default: 'analyze' },
        options: { type: 'object' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'mcp_omnysystem_generate_batch_tests',
    description: 'Generates tests for multiple functions without test coverage in batch.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 },
        minComplexity: { type: 'number', default: 5 },
        sortBy: { type: 'string', enum: ['risk', 'complexity', 'fragility', 'name'], default: 'risk' },
        dryRun: { type: 'boolean', default: true }
      }
    }
  },
  {
    name: 'mcp_omnysystem_consolidate_conceptual_cluster',
    description: 'Automatiza la consolidación de un cluster de duplicados conceptuales. Redirige los átomos hacia un SSOT (Source of Truth) de forma atómica.',
    inputSchema: {
      type: 'object',
      properties: {
        semanticFingerprint: { type: 'string', description: 'Fingerprint del cluster (ej: get:core:stats)' },
        ssotFilePath: { type: 'string', description: 'Ruta del archivo que será la fuente de Verdad' },
        execute: { type: 'boolean', default: false, description: 'Si es true, aplica los cambios. Si es false, solo previsualiza.' }
      },
      required: ['semanticFingerprint', 'ssotFilePath']
    }
  },
  {
    name: 'mcp_omnysystem_safe_edit',
    description: 'Editor de alto nivel con contexto automático, backup y validación extendida. Usa atomic_edit internamente pero obtiene el contexto exacto automáticamente. Ideal cuando no sabés el oldString exacto.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Ruta del archivo a editar (relativa al proyecto)' },
        lineNumber: { type: 'number', description: 'Línea objetivo para editar (opcional, usar con pattern o solo)' },
        pattern: { type: 'string', description: 'Patrón a buscar para reemplazar (opcional, usar con lineNumber o solo)' },
        newContent: { type: 'string', description: 'Nuevo contenido a insertar' },
        autoBackup: { type: 'boolean', default: true, description: 'Crear backup automático antes de editar' },
        dryRun: { type: 'boolean', default: false, description: 'Solo mostrar qué haría (no ejecutar)' },
        linesBefore: { type: 'number', default: 3, description: 'Líneas de contexto antes de la línea objetivo' },
        linesAfter: { type: 'number', default: 3, description: 'Líneas de contexto después de la línea objetivo' }
      },
      required: ['filePath', 'newContent'],
      oneOf: [
        { required: ['lineNumber'] },
        { required: ['pattern'] }
      ]
    }
  },
  {
    name: 'mcp_omnysystem_get_edit_context',
    description: 'Obtiene contexto exacto de edición para una línea específica. Útil para debugging o para obtener el oldString antes de usar atomic_edit.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Ruta del archivo (relativa al proyecto)' },
        lineNumber: { type: 'number', default: 1, description: 'Línea objetivo (1-based)' },
        linesBefore: { type: 'number', default: 3, description: 'Líneas de contexto antes' },
        linesAfter: { type: 'number', default: 3, description: 'Líneas de contexto después' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'mcp_omnysystem_suggest_canonical_api',
    description: 'Detecta acceso directo a DB en un archivo y sugiere APIs canónicas de query/apis/. Útil para refactorizar código que usa storage/repository directamente.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Ruta del archivo a analizar (relativa al proyecto)' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'mcp_omnysystem_validate_exports',
    description: 'Valida que los imports de un archivo existen en la cadena de exports. Detecta errores "module does not provide an export named X" antes del runtime.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Ruta del archivo a validar (relativa al proyecto)' },
        importName: { type: 'string', description: 'Nombre específico a validar (opcional, usar con fromModule)' },
        fromModule: { type: 'string', description: 'Módulo del import (opcional, usar con importName)' }
      },
      required: ['filePath']
    }
  }
];
