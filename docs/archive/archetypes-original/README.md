# Sistema de Arquetipos

**Versión**: v0.7.1  
**Última actualización**: 2026-02-12

---

## 🎯 Qué son los Arquetipos

Los arquetipos clasifican archivos y funciones según sus **patrones de conexión**: cómo una entidad se conecta con otras entidades del proyecto.

**Metáfora**: Cada archivo es una caja — al levantarla, ves cables conectados a otras cajas. El arquetipo te dice **qué tipo de cables tiene** y cuántos.

> **IMPORTANTE**: Los arquetipos NO detectan calidad de código. Cosas como "usa CSS-in-JS" no son arquetipos porque no cambian las conexiones del archivo.

---

## 📚 Documentos en esta Sección

| Documento | Descripción | Leer primero |
|-----------|-------------|--------------|
| [system.md](./system.md) | **Catálogo completo** + Sistema de Confianza + Decisiones LLM | ✅ Sí |
| [development.md](./development.md) | **Guía para crear arquetipos** + Box Test + Checklist | Para contribuidores |

---

## 🧠 Conceptos en 30 Segundos

### Box Test (Pilar 1)

Antes de crear un arquetipo, pregúntate:

> **"¿Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no vería?"**

- ✅ **SÍ** → Arquetipo válido
- ❌ **NO** → Solo metadata informativa

### Sistema de Confianza

Cada arquetipo calcula un **score de confianza** (0.0 - 1.0):

| Confianza | Acción | Tiempo |
|-----------|--------|--------|
| **>= 0.8** | BYPASS (sin LLM) | ~0ms |
| **0.5 - 0.8** | CONDITIONAL LLM (con contexto) | ~1-2s |
| **< 0.5** | FULL LLM | ~3-4s |

**Resultado**: 90% de archivos bypass LLM, 10% necesitan análisis.

---

## 📊 Catálogo Rápido

### Arquetipos Moleculares (Archivos)

| Arquetipo | Qué detecta | Confianza |
|-----------|-------------|-----------|
| `god-object` | Archivo con 20+ conexiones | Confidence-based |
| `dynamic-importer` | Imports dinámicos (runtime) | Siempre LLM |
| `event-hub` | Emite/escucha eventos | Confidence-based |
| `global-state` | Usa `window.*` o estado global | Confidence-based |
| `state-manager` | localStorage, sessionStorage | Confidence-based |
| `orphan-module` | Sin conexiones visibles | Confidence-based |
| `singleton` | Patrón singleton | Confidence-based |
| `facade` | Re-exports de otros módulos | 1.0 (determinístico) |
| `config-hub` | Configuración centralizada | 1.0 (determinístico) |
| `entry-point` | Punto de entrada de la app | 1.0 (determinístico) |
| `network-hub` | Múltiples llamadas a APIs | Confidence-based |
| `critical-bottleneck` | God-object + hotspot git | Confidence-based |
| `api-event-bridge` | Coordina APIs + eventos | Siempre LLM |

### Arquetipos Atómicos (Funciones)

| Arquetipo | Qué detecta |
|-----------|-------------|
| `god-function` | Función con complejidad > 20 |
| `fragile-network` | Fetch sin error handling |
| `hot-path` | Exportada y llamada por > 5 |
| `dead-function` | No exportada, no llamada |
| `utility` | Sin side effects, simple |

---

## 🔗 Relación con Otros Sistemas

```
01-core/principles.md (4 Pilares)
    ↓ (implementa Box Test y Atomic Composition)
02-architecture/archetypes/ (este directorio)
    ↓ (usa metadata de)
02-architecture/data-flow/ (concepts.md)
    ↓ (alimenta decisión en)
03-orchestrator/ (03-ORCHESTRATOR-INTERNO.md)
    ↓ (ejecuta análisis LLM cuando needed)
MCP Tools: get_molecule_summary, analyze_change
```

---

## 🚀 Uso Rápido

### Ver arquetipo de un archivo

```javascript
const summary = await get_molecule_summary({
  filePath: 'src/core/orchestrator.js'
});

console.log(summary.archetypes);
// [{ type: 'god-object', confidence: 0.95, evidence: [...] }]
```

### Decisión LLM en código

```javascript
const { confidence, evidence } = calculateConfidence(metadata);

if (confidence >= 0.8) {
  // BYPASS - No necesitamos LLM
  return { needsLLM: false, archetype: detectedType };
} else {
  // LLM con contexto
  return { 
    needsLLM: true, 
    context: `Detecté: ${evidence.join(', ')}` 
  };
}
```

---

**Siguiente paso**: Lee [system.md](./system.md) para el catálogo completo y sistema de confianza.
