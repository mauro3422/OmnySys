/**
 * @fileoverview System Analyzer - Analiza todo el proyecto
 * 
 * Detecta entry points globales, flujos de negocio completos
 * y construye el grafo del sistema.
 * 
 * @module module-system/system-analyzer
 * @phase 3
 */

import fs from 'fs';
import path from 'path';

export class SystemAnalyzer {
  constructor(projectRoot, modules) {
    this.projectRoot = projectRoot;
    this.modules = modules;
    this.moduleByName = new Map(modules.map(m => [m.moduleName, m]));
  }

  /**
   * Analiza el sistema completo
   */
  analyze() {
    // PASO 1: Encontrar entry points globales
    const entryPoints = this.findSystemEntryPoints();
    
    // PASO 2: Detectar flujos de negocio
    const businessFlows = this.detectBusinessFlows(entryPoints);
    
    // PASO 3: Mapear conexiones entre módulos
    const moduleConnections = this.mapModuleConnections();
    
    // PASO 4: Construir grafo del sistema
    const systemGraph = this.buildSystemGraph();
    
    // PASO 5: Detectar patrones arquitectónicos
    const patterns = this.detectArchitecturalPatterns();

    return {
      projectRoot: this.projectRoot,
      
      // Entry points
      entryPoints,
      
      // Flujos de negocio
      businessFlows,
      
      // Conexiones
      moduleConnections,
      
      // Grafo
      systemGraph,
      
      // Patrones
      patterns,
      
      // Resumen
      meta: {
        totalModules: this.modules.length,
        totalBusinessFlows: businessFlows.length,
        totalEntryPoints: entryPoints.length,
        totalConnections: moduleConnections.length,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Encuentra entry points del sistema
   */
  findSystemEntryPoints() {
    const entryPoints = [];
    
    // 1. Buscar API routes
    const apiRoutes = this.findAPIRoutes();
    entryPoints.push(...apiRoutes);
    
    // 2. Buscar CLI commands
    const cliCommands = this.findCLICommands();
    entryPoints.push(...cliCommands);
    
    // 3. Buscar event handlers
    const eventHandlers = this.findEventHandlers();
    entryPoints.push(...eventHandlers);
    
    // 4. Buscar scheduled jobs
    const scheduledJobs = this.findScheduledJobs();
    entryPoints.push(...scheduledJobs);
    
    // 5. Buscar exports principales
    const mainExports = this.findMainExports();
    entryPoints.push(...mainExports);

    return entryPoints;
  }

  /**
   * Busca API routes
   */
  findAPIRoutes() {
    const routes = [];
    
    // Buscar archivos comunes de routes
    const routePatterns = [
      'routes.js', 'router.js', 'api.js',
      'routes/*.js', 'api/*.js',
      'server.js', 'app.js'
    ];
    
    for (const module of this.modules) {
      for (const file of module.files) {
        if (routePatterns.some(pattern =>
          file.path.includes(pattern.replace('*', ''))
        )) {
          // Analizar archivo para encontrar rutas
          const fileRoutes = this.extractRoutesFromFile(file);
          routes.push(...fileRoutes);
        }
      }
    }
    
    return routes;
  }

  /**
   * Extrae rutas de un archivo
   */
  extractRoutesFromFile(file) {
    const routes = [];
    
    // Buscar molécula correspondiente
    const module = this.modules.find(m =>
      m.files.some(f => f.path === file.path)
    );
    
    if (!module) return routes;
    
    const molecule = this.findMolecule(file.path);
    if (!molecule) return routes;
    
    // Buscar patrones de rutas en el código
    for (const atom of molecule.atoms || []) {
      if (atom.isExported) {
        // Heurística: si está en archivo de routes, probablemente es handler
        const routePath = this.inferRoutePath(atom.name, file.path);
        
        if (routePath) {
          routes.push({
            type: 'api',
            method: this.inferHTTPMethod(atom.name, file.path),
            path: routePath,
            handler: {
              module: module.moduleName,
              file: path.basename(file.path),
              function: atom.name
            },
            middleware: this.findMiddleware(atom, molecule)
          });
        }
      }
    }
    
    return routes;
  }

  /**
   * Infiere path de ruta desde nombre de función
   */
  inferRoutePath(functionName, filePath) {
    // Patrones comunes
    const patterns = [
      { regex: /^get(.+)$/, transform: m => `/${this.camelToKebab(m[1])}` },
      { regex: /^create(.+)$/, transform: m => `/${this.camelToKebab(m[1])}` },
      { regex: /^update(.+)$/, transform: m => `/${this.camelToKebab(m[1])}/:id` },
      { regex: /^delete(.+)$/, transform: m => `/${this.camelToKebab(m[1])}/:id` },
      { regex: /^handle(.+)$/, transform: m => `/${this.camelToKebab(m[1])}` }
    ];
    
    for (const { regex, transform } of patterns) {
      const match = functionName.match(regex);
      if (match) {
        return transform(match);
      }
    }
    
    // Default: usar nombre del archivo
    const fileName = path.basename(filePath, '.js');
    if (fileName === 'routes' || fileName === 'api') {
      return `/${this.camelToKebab(functionName)}`;
    }
    
    return `/${this.camelToKebab(fileName)}/${this.camelToKebab(functionName)}`;
  }

  /**
   * Infiere método HTTP
   */
  inferHTTPMethod(functionName, filePath) {
    if (/^get|^find|^list|^search/i.test(functionName)) return 'GET';
    if (/^create|^add|^post/i.test(functionName)) return 'POST';
    if (/^update|^put|^patch/i.test(functionName)) return 'PUT';
    if (/^delete|^remove|^destroy/i.test(functionName)) return 'DELETE';
    if (/^handlePost/i.test(functionName)) return 'POST';
    if (/^handleGet/i.test(functionName)) return 'GET';
    
    return 'GET'; // Default
  }

  /**
   * Encuentra middleware usado por un handler
   */
  findMiddleware(atom, molecule) {
    const middleware = [];
    
    // Buscar en calls del átomo
    for (const call of atom.calls || []) {
      if (call.name.toLowerCase().includes('middleware') ||
          call.name.toLowerCase().includes('auth') ||
          call.name.toLowerCase().includes('validate')) {
        middleware.push({
          name: call.name,
          type: 'auth'
        });
      }
    }
    
    return middleware;
  }

  /**
   * Busca CLI commands
   */
  findCLICommands() {
    const commands = [];
    
    // Buscar archivos de CLI
    const cliModules = this.modules.filter(m =>
      m.moduleName === 'cli' ||
      m.files.some(f => f.path.includes('cli') || f.path.includes('commands'))
    );
    
    for (const module of cliModules) {
      for (const exp of module.exports || []) {
        if (exp.type === 'handler' || exp.name.toLowerCase().includes('command')) {
          commands.push({
            type: 'cli',
            command: this.camelToKebab(exp.name),
            handler: {
              module: module.moduleName,
              file: exp.file,
              function: exp.name
            }
          });
        }
      }
    }
    
    return commands;
  }

  /**
   * Busca event handlers
   */
  findEventHandlers() {
    const handlers = [];
    
    for (const module of this.modules) {
      for (const atom of this.getAllAtoms(module)) {
        // Buscar patrones de event handlers
        if (/^on[A-Z]|^handleEvent|^processEvent/i.test(atom.name)) {
          const eventName = this.inferEventName(atom.name);
          
          handlers.push({
            type: 'event',
            event: eventName,
            handler: {
              module: module.moduleName,
              file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
              function: atom.name
            }
          });
        }
      }
    }
    
    return handlers;
  }

  /**
   * Infiere nombre de evento
   */
  inferEventName(functionName) {
    if (/^on(.+)$/.test(functionName)) {
      return this.camelToKebab(functionName.match(/^on(.+)$/)[1]);
    }
    return 'unknown';
  }

  /**
   * Busca scheduled jobs
   */
  findScheduledJobs() {
    const jobs = [];
    
    // Buscar patrones de scheduled jobs
    for (const module of this.modules) {
      for (const atom of this.getAllAtoms(module)) {
        if (/^schedule|^cron|^job|^task/i.test(atom.name)) {
          jobs.push({
            type: 'scheduled',
            name: atom.name,
            schedule: 'unknown', // Requeriría análisis más profundo
            handler: {
              module: module.moduleName,
              file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
              function: atom.name
            }
          });
        }
      }
    }
    
    return jobs;
  }

  /**
   * Encuentra exports principales
   */
  findMainExports() {
    const exports = [];
    
    // Buscar index.js o main.js
    for (const module of this.modules) {
      const mainFile = module.files.find(f =>
        f.path.endsWith('index.js') ||
        f.path.endsWith('main.js')
      );
      
      if (mainFile) {
        const mainExports = module.exports?.filter(e =>
          e.file === path.basename(mainFile.path)
        ) || [];
        
        for (const exp of mainExports) {
          exports.push({
            type: 'library',
            name: exp.name,
            module: module.moduleName,
            exportedFrom: exp.file
          });
        }
      }
    }
    
    return exports;
  }

  /**
   * Detecta flujos de negocio
   */
  detectBusinessFlows(entryPoints) {
    const flows = [];
    
    for (const entry of entryPoints) {
      // Solo analizar API routes principales
      if (entry.type !== 'api') continue;
      
      const flow = this.traceBusinessFlow(entry);
      if (flow.steps.length > 1) {
        flows.push(flow);
      }
    }
    
    return flows;
  }

  /**
   * Trackea flujo de negocio desde un entry point
   */
  traceBusinessFlow(entry) {
    const steps = [];
    const visited = new Set();
    const queue = [{
      module: entry.handler.module,
      function: entry.handler.function,
      order: 1,
      input: ['request']
    }];
    
    while (queue.length > 0 &> steps.length < 20) { // Limitar profundidad
      const current = queue.shift();
      
      if (visited.has(`${current.module}.${current.function}`)) continue;
      visited.add(`${current.module}.${current.function}`);
      
      // Buscar átomo
      const atom = this.findAtom(current.module, current.function);
      
      if (atom) {
        const step = {
          order: current.order,
          module: current.module,
          file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
          function: current.function,
          input: current.input,
          output: atom.dataFlow?.outputs?.map(o =>
            o.type === 'return' ? 'return' : o.target
          ) || [],
          async: atom.isAsync || false,
          sideEffects: this.classifySideEffects(atom),
          next: []
        };
        
        steps.push(step);
        
        // Agregar calls a la cola
        for (const call of atom.calls || []) {
          if (call.type === 'external') {
            const targetModule = this.inferModuleFromCall(call.name);
            if (targetModule && this.moduleByName.has(targetModule)) {
              queue.push({
                module: targetModule,
                function: call.name,
                order: current.order + 1,
                input: call.args?.map(a => a.name || 'arg') || []
              });
            }
          }
        }
      }
    }
    
    return {
      name: this.inferFlowName(entry),
      type: entry.type,
      entryPoint: entry,
      steps,
      totalSteps: steps.length,
      modulesInvolved: [...new Set(steps.map(s => s.module))],
      hasAsync: steps.some(s => s.async),
      sideEffects: this.aggregateSideEffects(steps)
    };
  }

  /**
   * Infiere nombre del flujo
   */
  inferFlowName(entry) {
    if (entry.type === 'api') {
      return `${entry.method.toLowerCase()}_${entry.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    return entry.handler.function;
  }

  /**
   * Clasifica side effects de un átomo
   */
  classifySideEffects(atom) {
    const effects = [];
    
    if (atom.hasNetworkCalls) effects.push('network');
    if (atom.hasSideEffects && atom.dataFlow?.outputs?.some(o => o.type === 'side_effect')) {
      effects.push('storage');
    }
    
    return effects;
  }

  /**
   * Agrega side effects de todos los pasos
   */
  aggregateSideEffects(steps) {
    const allEffects = steps.flatMap(s => s.sideEffects);
    const unique = [...new Set(allEffects)];
    
    return unique.map(effect => ({
      type: effect,
      steps: steps.filter(s => s.sideEffects.includes(effect)).map(s => ({
        module: s.module,
        function: s.function
      }))
    }));
  }

  /**
   * Mapea conexiones entre módulos
   */
  mapModuleConnections() {
    const connections = [];
    
    for (const fromModule of this.modules) {
      for (const toModule of this.modules) {
        if (fromModule.moduleName === toModule.moduleName) continue;
        
        // Verificar si fromModule importa de toModule
        const imports = fromModule.imports?.filter(imp =
003e
          imp.module === toModule.moduleName
        ) || [];
        
        if (imports.length > 0) {
          connections.push({
            from: fromModule.moduleName,
            to: toModule.moduleName,
            type: 'dependency',
            dataFlow: {
              imports: imports.flatMap(i => i.functions),
              count: imports.reduce((sum, i) => sum + i.count, 0)
            },
            strength: this.calculateConnectionStrength(fromModule, toModule)
          });
        }
      }
    }
    
    return connections;
  }

  /**
   * Calcula fuerza de conexión entre módulos
   */
  calculateConnectionStrength(from, to) {
    const importCount = from.imports?.find(i => i.module === to.moduleName)?.count || 0;
    const totalFunctions = from.metrics?.totalFunctions || 1;
    
    const ratio = importCount / totalFunctions;
    
    if (ratio > 0.5) return 'strong';
    if (ratio > 0.2) return 'medium';
    return 'weak';
  }

  /**
   * Construye grafo del sistema
   */
  buildSystemGraph() {
    const nodes = this.modules.map(m => ({
      id: m.moduleName,
      type: 'module',
      metrics: m.metrics,
      exports: m.exports?.length || 0,
      entryPoints: this.findModuleEntryPoints(m)
    }));
    
    const edges = this.mapModuleConnections().map(c => ({
      from: c.from,
      to: c.to,
      type: c.type,
      strength: c.strength,
      dataFlow: c.dataFlow
    }));
    
    return { nodes, edges };
  }

  /**
   * Detecta patrones arquitectónicos
   */
  detectArchitecturalPatterns() {
    const patterns = [];
    
    // Patrón: Layered Architecture
    const hasLayers = this.modules.some(m =>
      ['controllers', 'services', 'repositories', 'models'].includes(m.moduleName)
    );
    
    if (hasLayers) {
      patterns.push({
        name: 'Layered Architecture',
        confidence: 0.8,
        evidence: 'Modules organized in layers'
      });
    }
    
    // Patrón: Microservices-like
    const serviceModules = this.modules.filter(m =>
      m.moduleName.includes('service') ||
      m.exports?.some(e => e.type === 'service')
    );
    
    if (serviceModules.length >= 3) {
      patterns.push({
        name: 'Service-Oriented',
        confidence: 0.7,
        evidence: `${serviceModules.length} service modules detected`
      });
    }
    
    // Patrón: Event-Driven
    const hasEvents = this.modules.some(m =>
      m.moduleName === 'events' ||
      m.files.some(f => f.path.includes('event'))
    );
    
    if (hasEvents) {
      patterns.push({
        name: 'Event-Driven Elements',
        confidence: 0.6,
        evidence: 'Event-related modules found'
      });
    }
    
    return patterns;
  }

  // Helper methods

  findMolecule(filePath) {
    for (const module of this.modules) {
      const mol = module.molecules?.find(m => m.filePath === filePath);
      if (mol) return mol;
    }
    return null;
  }

  findAtom(moduleName, functionName) {
    const module = this.moduleByName.get(moduleName);
    if (!module) return null;
    
    for (const file of module.files || []) {
      // Buscar en molécula
      const mol = this.findMolecule(file.path);
      if (mol) {
        const atom = mol.atoms?.find(a => a.name === functionName);
        if (atom) return atom;
      }
    }
    
    return null;
  }

  getAllAtoms(module) {
    const atoms = [];
    for (const file of module.files || []) {
      const mol = this.findMolecule(file.path);
      if (mol?.atoms) {
        atoms.push(...mol.atoms.map(a => ({ ...a, filePath: file.path })));
      }
    }
    return atoms;
  }

  findModuleEntryPoints(module) {
    const entries = [];
    
    // API routes
    const apiFiles = module.files?.filter(f =>
      f.path.includes('routes') || f.path.includes('api')
    ) || [];
    
    for (const file of apiFiles) {
      entries.push({ type: 'api', file: path.basename(file.path) });
    }
    
    // Main exports
    for (const exp of module.exports || []) {
      if (exp.type === 'handler' || exp.usedBy > 5) {
        entries.push({
          type: 'export',
          function: exp.name,
          file: exp.file
        });
      }
    }
    
    return entries;
  }

  camelToKebab(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
      .replace(/^-/, '');
  }

  inferModuleFromCall(functionName) {
    // Usar mismo método que en ModuleAnalyzer
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
    
    return null;
  }
}

export default SystemAnalyzer;
