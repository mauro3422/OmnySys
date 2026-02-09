/**
 * @fileoverview Module Analyzer - Analiza un módulo (carpeta) completo
 * 
 * Analiza todas las moléculas (archivos) dentro de un módulo
 * y detecta conexiones entre ellos.
 * 
 * @module module-system/module-analyzer
 * @phase 3
 */

import path from 'path';

export class ModuleAnalyzer {
  constructor(modulePath, molecules) {
    this.modulePath = modulePath;
    this.moduleName = path.basename(modulePath);
    this.molecules = molecules.filter(m =>
      m.filePath.startsWith(modulePath) ||
      m.filePath.includes(`/${this.moduleName}/`)
    );
    
    // Indexar por nombre de archivo
    this.moleculeByFile = new Map();
    for (const mol of this.molecules) {
      const fileName = path.basename(mol.filePath);
      this.moleculeByFile.set(fileName, mol);
    }
  }

  /**
   * Analiza el módulo completo
   */
  analyze() {
    // Encontrar conexiones entre archivos
    const crossFileConnections = this.findCrossFileConnections();
    
    // Identificar entry points del módulo
    const exports = this.findModuleExports();
    
    // Identificar dependencias externas
    const imports = this.findModuleImports();
    
    // Construir chains internas del módulo
    const internalChains = this.buildInternalModuleChains(crossFileConnections);
    
    // Calcular métricas
    const metrics = this.calculateMetrics();

    return {
      modulePath: this.modulePath,
      moduleName: this.moduleName,
      
      // Archivos en el módulo
      files: this.molecules.map(m => ({
        path: m.filePath,
        atomCount: m.atomCount,
        exports: m.atoms.filter(a => a.isExported).map(a => a.name),
        hasSideEffects: m.atoms.some(a => a.hasSideEffects)
      })),
      
      // Conexiones entre archivos
      crossFileConnections,
      
      // Entry points
      exports,
      
      // Dependencias
      imports,
      
      // Chains internas
      internalChains,
      
      // Métricas
      metrics
    };
  }

  /**
   * Encuentra conexiones entre archivos del módulo
   */
  findCrossFileConnections() {
    const connections = [];
    
    for (const callerMol of this.molecules) {
      for (const atom of callerMol.atoms || []) {
        for (const call of atom.calls || []) {
          // Verificar si es llamada interna (mismo módulo)
          const calleeMol = this.findCalleeInModule(call.name);
          
          if (calleeMol && calleeMol.filePath !== callerMol.filePath) {
            // Es una conexión cross-file
            const connection = this.analyzeConnection(
              callerMol, 
              atom, 
              calleeMol, 
              call
            );
            
            connections.push(connection);
          }
        }
      }
    }
    
    return connections;
  }

  /**
   * Busca si un callee está en este módulo
   */
  findCalleeInModule(functionName) {
    for (const mol of this.molecules) {
      const found = mol.atoms?.find(a => a.name === functionName);
      if (found) return mol;
    }
    return null;
  }

  /**
   * Analiza una conexión específica
   */
  analyzeConnection(callerMol, callerAtom, calleeMol, call) {
    // Buscar el átomo callee
    const calleeAtom = calleeMol.atoms?.find(a => a.name === call.name);
    
    // Mapear argumentos
    const dataFlow = this.mapCallArguments(call, calleeAtom);

    return {
      from: {
        file: path.basename(callerMol.filePath),
        function: callerAtom.name,
        atomId: callerAtom.id
      },
      to: {
        file: path.basename(calleeMol.filePath),
        function: call.name,
        atomId: calleeAtom?.id
      },
      dataFlow,
      callSite: call.line || 0,
      isAsync: call.isAsync || false
    };
  }

  /**
   * Mapea argumentos de una llamada
   */
  mapCallArguments(call, calleeAtom) {
    if (!call.args || !calleeAtom?.dataFlow?.inputs) {
      return [];
    }

    return call.args.map((arg, index) => {
      const param = calleeAtom.dataFlow.inputs[index];
      
      return {
        position: index,
        source: arg.name || arg.code || String(arg),
        target: param?.name || `param_${index}`,
        transform: this.detectArgumentTransform(arg)
      };
    });
  }

  /**
   * Detecta transformación en argumento
   */
  detectArgumentTransform(arg) {
    if (!arg) return 'unknown';
    
    if (arg.type === 'MemberExpression') {
      return 'property_access';
    }
    
    if (arg.type === 'CallExpression') {
      return 'call_result';
    }
    
    if (arg.type === 'Identifier') {
      return 'direct_pass';
    }
    
    return 'expression';
  }

  /**
   * Encuentra exports del módulo
   */
  findModuleExports() {
    const exports = [];
    
    for (const mol of this.molecules) {
      for (const atom of mol.atoms || []) {
        if (atom.isExported) {
          exports.push({
            name: atom.name,
            file: path.basename(mol.filePath),
            atomId: atom.id,
            type: this.classifyExport(atom),
            usedBy: atom.calledBy?.length || 0
          });
        }
      }
    }
    
    return exports;
  }

  /**
   * Clasifica tipo de export
   */
  classifyExport(atom) {
    if (atom.name.toLowerCase().includes('middleware')) {
      return 'middleware';
    }
    
    if (/^handle|^on[A-Z]|^process/.test(atom.name)) {
      return 'handler';
    }
    
    if (atom.hasSideEffects) {
      return 'service';
    }
    
    if (atom.dataFlow?.transformations?.length === 0) {
      return 'utility';
    }
    
    return 'function';
  }

  /**
   * Encuentra imports del módulo (dependencias externas)
   */
  findModuleImports() {
    const imports = new Map(); // module -> Set of imports
    
    for (const mol of this.molecules) {
      for (const atom of mol.atoms || []) {
        for (const call of atom.calls || []) {
          if (call.type === 'external') {
            // Intentar inferir el módulo desde el nombre
            const moduleName = this.inferModuleFromCall(call.name);
            
            if (moduleName && moduleName !== this.moduleName) {
              if (!imports.has(moduleName)) {
                imports.set(moduleName, new Set());
              }
              imports.get(moduleName).add(call.name);
            }
          }
        }
      }
    }
    
    // Convertir a array
    return Array.from(imports.entries()).map(([module, functions]) => ({
      module,
      functions: Array.from(functions),
      count: functions.size
    }));
  }

  /**
   * Intenta inferir módulo desde nombre de llamada
   */
  inferModuleFromCall(functionName) {
    // Patrones comunes
    const patterns = [
      { prefix: /^db\./, module: 'database' },
      { prefix: /^redis\./, module: 'redis' },
      { prefix: /^cache\./, module: 'cache' },
      { prefix: /^logger\./, module: 'logger' },
      { prefix: /^config\./, module: 'config' }
    ];
    
    for (const { prefix, module } of patterns) {
      if (prefix.test(functionName)) {
        return module;
      }
    }
    
    // Si no coincide, retornar 'external'
    return 'external';
  }

  /**
   * Construye chains internas del módulo
   */
  buildInternalModuleChains(connections) {
    const chains = [];
    const visited = new Set();
    
    // Encontrar entry points del módulo
    const entries = this.findModuleEntryFunctions();
    
    for (const entry of entries) {
      const chain = this.traceModuleChain(entry, connections, visited);
      if (chain.length > 1) {
        chains.push({
          id: `module_chain_${chains.length}`,
          entryFunction: entry.name,
          entryFile: path.basename(entry.filePath),
          steps: chain,
          totalSteps: chain.length,
          isAsync: chain.some(s => s.isAsync),
          hasSideEffects: chain.some(s => s.hasSideEffects)
        });
      }
    }
    
    return chains;
  }

  /**
   * Encuentra funciones entry del módulo
   */
  findModuleEntryFunctions() {
    const entries = [];
    
    for (const mol of this.molecules) {
      for (const atom of mol.atoms || []) {
        // Es entry si está exportada o no tiene callers internos
        if (atom.isExported) {
          entries.push({ ...atom, filePath: mol.filePath });
        } else if (!atom.calledBy?.some(callerId => {
          const callerName = callerId.split('::').pop();
          return this.moleculeByFile.has(callerName + '.js') ||
                 this.findCalleeInModule(callerName);
        })) {
          entries.push({ ...atom, filePath: mol.filePath });
        }
      }
    }
    
    return entries;
  }

  /**
   * Trackea chain desde un entry
   */
  traceModuleChain(entry, connections, visited) {
    const chain = [{
      function: entry.name,
      file: path.basename(entry.filePath),
      atomId: entry.id,
      isAsync: entry.isAsync,
      hasSideEffects: entry.hasSideEffects
    }];
    
    // Buscar conexiones salientes
    const outgoing = connections.filter(c =>
      c.from.function === entry.name &&
      !visited.has(`${c.from.function}->${c.to.function}`)
    );
    
    for (const conn of outgoing) {
      visited.add(`${conn.from.function}->${conn.to.function}`);
      
      // Encontrar átomo destino
      const calleeMol = this.moleculeByFile.get(conn.to.file);
      const calleeAtom = calleeMol?.atoms?.find(a => a.name === conn.to.function);
      
      if (calleeAtom) {
        const subChain = this.traceModuleChain(
          { ...calleeAtom, filePath: calleeMol.filePath },
          connections,
          visited
        );
        chain.push(...subChain.slice(1));
      }
    }
    
    return chain;
  }

  /**
   * Calcula métricas del módulo
   */
  calculateMetrics() {
    const totalFunctions = this.molecules.reduce(
      (sum, m) => sum + (m.atoms?.length || 0), 0
    );
    
    const exportedFunctions = this.molecules.reduce(
      (sum, m) => sum + (m.atoms?.filter(a => a.isExported).length || 0), 0
    );
    
    const functionsWithSideEffects = this.molecules.reduce(
      (sum, m) => sum + (m.atoms?.filter(a => a.hasSideEffects).length || 0), 0
    );
    
    return {
      totalFiles: this.molecules.length,
      totalFunctions,
      exportedFunctions,
      privateFunctions: totalFunctions - exportedFunctions,
      functionsWithSideEffects,
      averageComplexity: this.calculateAverageComplexity(),
      cohesion: this.calculateCohesion(),
      coupling: this.calculateCoupling()
    };
  }

  /**
   * Calcula complejidad promedio
   */
  calculateAverageComplexity() {
    const complexities = this.molecules.flatMap(m =>
      (m.atoms || []).map(a => a.complexity || 0)
    );
    
    if (complexities.length === 0) return 0;
    
    const sum = complexities.reduce((a, b) => a + b, 0);
    return Math.round((sum / complexities.length) * 10) / 10;
  }

  /**
   * Calcula cohesión (qué tan relacionadas están las funciones)
   */
  calculateCohesion() {
    // Métrica simplificada: % de funciones que llaman a otras del mismo módulo
    const allAtoms = this.molecules.flatMap(m => m.atoms || []);
    const functionNames = new Set(allAtoms.map(a => a.name));
    
    let connectedCount = 0;
    
    for (const atom of allAtoms) {
      const hasInternalCalls = atom.calls?.some(c =>
        functionNames.has(c.name)
      );
      
      if (hasInternalCalls || atom.calledBy?.some(caller =>
        functionNames.has(caller.split('::').pop())
      )) {
        connectedCount++;
      }
    }
    
    return allAtoms.length > 0 ? connectedCount / allAtoms.length : 0;
  }

  /**
   * Calcula acoplamiento (dependencias externas)
   */
  calculateCoupling() {
    const allAtoms = this.molecules.flatMap(m => m.atoms || []);
    let externalCalls = 0;
    let totalCalls = 0;
    
    for (const atom of allAtoms) {
      for (const call of atom.calls || []) {
        totalCalls++;
        if (call.type === 'external') {
          externalCalls++;
        }
      }
    }
    
    return totalCalls > 0 ? externalCalls / totalCalls : 0;
  }
}

export default ModuleAnalyzer;
