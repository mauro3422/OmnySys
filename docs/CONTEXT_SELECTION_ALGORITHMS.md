# Algoritmos de Selección de Contexto

**Versión**: v0.5.1  
**Última actualización**: 2026-02-06

---

## Overview

Este documento describe los algoritmos utilizados por OmnySys para determinar qué archivos son relevantes cuando una IA va a editar código.

> **Problema**: Cuando vas a editar `CameraState.js` en un proyecto de 500 archivos, ¿cuáles de esos 500 archivos son RELEVANTES? No puedes pasar todos (contexto saturado), pero necesitas los correctos.

---

## Algoritmo 1: Relevancia por Distancia (Graph Distance)

**Estrategia**: Filtrar por proximidad en el grafo de dependencias

### Jerarquía de Tiers

```
TIER 0 (Distancia 0) - El archivo objetivo
├── CameraState.js ✅ SIEMPRE

TIER 1 (Distancia 1) - Dependencias directas
├── usedBy: [RenderEngine.js, MinimapUI.js] ✅ SIEMPRE
├── dependsOn: [Vector2D.js, MathUtils.js] ✅ SIEMPRE

TIER 2 (Distancia 2) - Dependencias transitivas
├── usedBy: [GameLoop.js, SceneManager.js] ⚠️ SELECTIVO
├── dependsOn: [Constants.js] ⚠️ SELECTIVO

TIER 3+ (Distancia 3+)
├── Demasiado lejos ❌ IGNORAR (excepto si es HOTSPOT)
```

**Regla de oro**: Pasar TIER 0 + TIER 1 completo + TIER 2 filtrado por score

---

## Algoritmo 2: Relevancia por Scoring

**Estrategia**: Calcular score de relevancia para cada archivo

```javascript
function calculateRelevanceScore(file, targetFile, analysis) {
  let score = 100; // Base score

  // 🔥 BOOSTS (aumentan relevancia)
  if (isDirectDependency(file, targetFile)) score += 100;
  if (isHotspot(file, analysis)) score += 50;
  if (hasHighCoupling(file, targetFile, analysis)) score += 30;
  if (sharesConstants(file, targetFile)) score += 20;
  if (sharesTypes(file, targetFile)) score += 15;

  // 🧊 PENALTIES (reducen relevancia)
  if (isTestFile(file)) score -= 50;
  if (isConfigFile(file)) score -= 40;
  if (isBuildTool(file)) score -= 60;
  if (distance > 2) score -= 30 * (distance - 2);

  return Math.max(0, score);
}
```

**Threshold**: Solo pasar archivos con `score >= 100`

---

## Algoritmo 3: Symbol-Level Filtering

**Problema**: No todas las dependencias son iguales

```javascript
// CameraState.js exporta:
export const position = { x, y };      // Usado por 10 archivos
export const zoom = 1.0;               // Usado por 3 archivos
export function toJSON() { ... }       // Usado por 1 archivo (SaveManager)

// Si vas a editar position:
✅ Pasar: MinimapUI.js, PlayerMovement.js (usan position)
❌ NO pasar: SaveManager.js (solo usa toJSON)
```

**Implementación**:
- Usar `constantUsage`, `objectExports` del análisis
- Preguntar: "¿Qué símbolo específico vas a modificar?"
- Filtrar solo archivos que usan ESE símbolo

---

## Algoritmo 4: Risk-Based Expansion

**Estrategia**: Si el archivo es CRÍTICO, ampliar contexto

```javascript
if (isHotspot(targetFile) && callers >= 15) {
  // Archivo super crítico - pasar MÁS contexto
  maxFiles = 15;
  includeAllCallers = true;
  warnings.push("⚠️ CRITICAL FILE: 15+ files depend on this");
}

if (hasCircularDependency(targetFile)) {
  // Dependency hell - advertir
  warnings.push("🔴 CIRCULAR DEPENDENCY: Review carefully");
  includeCircularFiles = true;
}

if (couplingStrength >= 5) {
  // Alto acoplamiento - pasar archivos acoplados
  includeCoupledFiles = true;
  warnings.push("⚠️ HIGH COUPLING: Changes may cascade");
}
```

---

## Formato de Inyección de Contexto

### Formato Estándar (Para ediciones normales)

```markdown
🧭 CONTEXT FOR EDITING: src/game/CameraState.js

📁 AFFECTED FILES (4):
  1. src/game/RenderEngine.js (imports: position, zoom, rotation)
     - Direct dependency
     - Hotspot: 23 callers

  2. src/ui/MinimapUI.js (imports: position)
     - Direct dependency
     - High coupling detected

⚠️  WARNINGS:
  - CameraState.js is a HOTSPOT (used by 15 files)
  - High coupling with RenderEngine.js (bidirectional)

💡 RECOMMENDATIONS:
  - Test camera movement after changes
  - Verify minimap sync
```

### Formato Compacto (Para archivos simples)

```markdown
🧭 CameraState.js → Affects: RenderEngine.js, MinimapUI.js (2 files)
⚠️  Hotspot (15 callers) - Test carefully
```

---

## Referencias

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Arquitectura general
- [MCP_TOOLS.md](MCP_TOOLS.md) - Herramientas MCP
- [ROADMAP.md](../ROADMAP.md) - Fases de desarrollo

---

*Documento migrado desde ROADMAP2.MD - Fase 4: Context Delivery System*
