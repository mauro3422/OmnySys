# FASE 7: Nivel Módulo y Sistema

**Estado**: Pre-implementación  
**Dependencias**: Fases 1-6 (necesita todo el stack anterior)  
**Tiempo estimado**: 1-2 días

---

## 🎯 Objetivo

Derivar metadata a nivel de **carpetas (módulos)** y del **proyecto completo (sistema)**, aplicando el mismo patrón fractal A→B→C.

---

## 📊 Ejemplo: Nivel Módulo

### Estructura

```
src/
  auth/
    login.js
    validate.js
    session.js
  cart/
    addItem.js
    calculate.js
    checkout.js
```

### Derivación

```javascript
// Módulo: auth/
{
  name: "auth",
  type: "module",
  
  // A: Datos que entran al módulo
  inputs: [
    { name: "credentials", source: "external", entryPoint: "login.js" },
    { name: "token", source: "external", entryPoint: "validate.js" }
  ],
  
  // B: Flujo interno entre archivos
  internalFlows: [
    { from: "login.js", to: "session.js", data: "userId" },
    { from: "validate.js", to: "session.js", data: "token" }
  ],
  
  // C: Datos que salen del módulo
  outputs: [
    { type: "session", exportedBy: "session.js" },
    { type: "auth_error", exportedBy: "validate.js" }
  ],
  
  // Metadata derivada
  domain: "authentication",
  archetype: "security-layer",
  dependsOn: [],  // No depende de otros módulos internos
  dependedBy: ["cart", "payment"]
}
```

---

## 📊 Ejemplo: Nivel Sistema

```javascript
// Sistema: Proyecto completo
{
  name: "OmnySystem",
  type: "system",
  
  // A: Entry points del sistema
  entryPoints: [
    { type: "api", module: "routes", endpoint: "/api/*" },
    { type: "cli", module: "commands" },
    { type: "file_watcher", module: "watcher" }
  ],
  
  // B: Flujos de negocio completos (detectados automáticamente)
  businessFlows: [
    {
      name: "checkout",
      type: "transaction",
      steps: ["cart.addItem", "cart.calculate", "payment.process", "notification.send"],
      entryPoint: "cart.checkout",
      sideEffects: ["database", "email"]
    },
    {
      name: "auth",
      type: "security",
      steps: ["auth.login", "auth.validate", "auth.session"],
      entryPoint: "auth.login",
      sideEffects: ["session_storage"]
    }
  ],
  
  // C: Side effects del sistema
  externalEffects: [
    { type: "database", modules: ["db", "repository"] },
    { type: "email", modules: ["notifications"] },
    { type: "filesystem", modules: ["watcher"] }
  ],
  
  // Bottlenecks detectados
  bottlenecks: [
    {
      function: "auth.validateToken",
      calledBy: 23,
      severity: "medium",
      recommendation: "Considerar caching"
    }
  ],
  
  // Métricas
  metrics: {
    totalModules: 8,
    totalFiles: 45,
    totalFunctions: 230,
    avgComplexity: 8.5,
    asyncFunctions: 67,
    potentialRaceConditions: 3
  }
}
```

---

## 🔧 Implementación

### Paso 1: Derivación de Módulo

```javascript
// src/shared/module-derivation.js

export function deriveModule(molecules, modulePath) {
  // Filtrar moléculas de este módulo
  const moduleMolecules = molecules.filter(m => 
    m.id.startsWith(modulePath)
  );
  
  return {
    name: path.basename(modulePath),
    path: modulePath,
    
    // A: Inputs (datos que vienen de fuera del módulo)
    inputs: moduleMolecules
      .flatMap(m => m.dataFlow?.inputs || [])
      .filter(i => i.isFromExternalModule),
    
    // B: Internal flows (conexiones entre archivos del módulo)
    internalFlows: buildInternalFlows(moduleMolecules),
    
    // C: Outputs (exports públicos)
    outputs: moduleMolecules
      .filter(m => m.isPublicApi)
      .flatMap(m => m.dataFlow?.outputs || []),
    
    // Metadata derivada
    domain: detectDomain(moduleMolecules),
    archetype: detectModuleArchetype(moduleMolecules),
    complexity: moduleMolecules.reduce((sum, m) => 
      sum + (m.derived?.totalComplexity || 0), 0
    ),
    
    // Dependencias
    dependsOn: findExternalDependencies(moduleMolecules, modulePath),
    dependedBy: []  // Se llena en segundo paso
  };
}

function detectDomain(molecules) {
  // Extraer dominio de los nombres semánticos
  const domains = molecules
    .flatMap(m => m.atoms || [])
    .map(a => a.semantic?.domain)
    .filter(Boolean);
  
  // Votación mayoritaria
  return mostCommon(domains);
}

function detectModuleArchetype(molecules) {
  const archetypes = molecules.map(m => m.derived?.archetype?.type);
  
  if (archetypes.includes('network-hub')) {
    return 'api-gateway';
  }
  if (archetypes.every(a => a === 'data-access')) {
    return 'data-layer';
  }
  if (archetypes.includes('business-logic')) {
    return 'business-logic';
  }
  return 'utility-belt';
}
```

### Paso 2: Derivación de Sistema

```javascript
// src/shared/system-derivation.js

export function deriveSystem(modules, entryPoints) {
  return {
    name: "System",
    
    // A: Entry points
    entryPoints: modules
      .filter(m => m.hasHttpHandlers || m.hasCliHandlers)
      .flatMap(m => ({
        type: m.hasHttpHandlers ? 'api' : 'cli',
        module: m.name
      })),
    
    // B: Flujos de negocio detectados
    businessFlows: detectBusinessFlows(modules),
    
    // C: Side effects externos
    externalEffects: modules.flatMap(m => m.sideEffects),
    
    // Análisis adicionales
    bottlenecks: detectBottlenecks(modules),
    metrics: calculateMetrics(modules)
  };
}

function detectBusinessFlows(modules) {
  const flows = [];
  
  // Buscar patrones: entry point → múltiples pasos → side effect
  for (const module of modules) {
    for (const mol of module.molecules) {
      const exported = mol.atoms?.filter(a => a.isExported);
      
      for (const entry of exported) {
        const chain = traceBusinessChain(entry, modules);
        if (chain.length >= 3) {  // Flujo significativo
          flows.push({
            name: guessFlowName(chain),
            entryPoint: `${module.name}.${entry.name}`,
            steps: chain.map(c => `${c.module}.${c.function}`),
            type: classifyFlowType(chain),
            sideEffects: chain.filter(c => c.hasSideEffects)
          });
        }
      }
    }
  }
  
  return flows;
}

function detectBottlenecks(modules) {
  const bottlenecks = [];
  
  for (const module of modules) {
    for (const mol of module.molecules) {
      for (const atom of mol.atoms || []) {
        const callCount = atom.calledBy?.length || 0;
        
        if (callCount > 20) {
          bottlenecks.push({
            function: `${module.name}.${atom.name}`,
            calledBy: callCount,
            severity: callCount > 50 ? 'high' : 'medium',
            recommendation: callCount > 50 
              ? 'Considerar caching o split'
              : 'Monitorear uso'
          });
        }
      }
    }
  }
  
  return bottlenecks.sort((a, b) => b.calledBy - a.calledBy);
}
```

---

## 📊 Arquitectura Completa

```
┌─────────────────────────────────────────────┐
│              SISTEMA                        │
│  Entry Points: API, CLI, File Watcher      │
│  Business Flows: checkout, auth, etc.      │
│  Bottlenecks: validateToken (23 calls)     │
└──────────────┬──────────────────────────────┘
               │ DERIVA
┌──────────────▼──────────────────────────────┐
│            MÓDULO: auth/                    │
│  Domain: authentication                     │
│  Archetype: security-layer                  │
│  Depends on: []                             │
│  Depended by: [cart, payment]               │
└──────────────┬──────────────────────────────┘
               │ DERIVA
┌──────────────▼──────────────────────────────┐
│          MOLÉCULA: login.js                 │
│  Exports: [validateCredentials]             │
│  Data Flow: inputs → chains → outputs      │
│  Flow Type: validation-gate                 │
└──────────────┬──────────────────────────────┘
               │ DERIVA
┌──────────────▼──────────────────────────────┐
│           ÁTOMO: validateCredentials        │
│  Inputs: [credentials]                      │
│  Transformations: 3                         │
│  Outputs: [return, side_effect]             │
│  Archetype: validation-gate                 │
└─────────────────────────────────────────────┘
```

---

## 🎁 Beneficios

1. **Vista de pájaro**: Entender el sistema completo en una mirada
2. **Business flows documentados**: "El checkout tiene estos 5 pasos"
3. **Bottlenecks identificados**: Saber dónde optimizar
4. **Arquitectura validada**: Detectar violaciones de capas
5. **Onboarding**: Nuevo dev ve el mapa completo del sistema

---

## ✅ Checklist de Implementación

- [ ] Implementar `deriveModule()` con A→B→C
- [ ] Implementar `deriveSystem()` con entry points
- [ ] Detectar business flows automáticamente
- [ ] Detectar bottlenecks
- [ ] Calcular métricas del sistema
- [ ] Crear visualización (diagrama de arquitectura)
- [ ] Tests con estructura real de carpetas
- [ ] Optimizar para proyectos grandes (+100 archivos)

---

## 📚 Referencias

- [Documento Original - Sección 6](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#6-nivel-modulo-y-sistema)

---

**¡Fin de las Fases!**

Ahora tienes el roadmap completo para implementar Data Flow Fractal desde 0 hasta sistema completo con 97% cobertura.

**Empezar**: [→ Fase 1: Data Flow Atómico](./01_FASE_ATOMO.md)
