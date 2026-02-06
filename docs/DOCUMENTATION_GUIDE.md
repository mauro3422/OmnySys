# Guía de Documentación - OmnySys

**Version**: v0.5.2
**Ultima actualizacion**: 2026-02-06

---

## Propósito

Esta guía establece las convenciones y mejores prácticas para mantener la documentación de OmnySys organizada, consistente y actualizada.

---

## Estructura de Documentación

### Niveles de Documentación

```
OmnySys/
├── README.md                    # Entry point - Vision general
├── GETTING_STARTED.md           # Guia de inicio rapido
├── ROADMAP.md                   # Plan de desarrollo
├── ARCHITECTURE.md              # Diseno tecnico (diagrama, SOLID, SSOT)
├── CHANGELOG.md                 # Indice de changelogs
│
├── docs/
│   ├── INDEX.md                 # Indice maestro de documentacion
│   ├── DOCUMENTATION_GUIDE.md   # Esta guia
│   ├── ARCHITECTURE_LAYER_A_B.md # Detalle Layers A y B
│   ├── MCP_TOOLS.md             # Tools MCP, CLI, troubleshooting
│   ├── AI_MODELS_GUIDE.md       # Modelos LFM2.5 (setup, prompting, GPU)
│   ├── ARCHETYPE_SYSTEM.md      # Sistema de arquetipos
│   ├── ARCHETYPE_DEVELOPMENT_GUIDE.md # Guia desarrollo arquetipos
│   ├── metadata-prompt-system.md # Flujo metadata -> prompt -> LLM
│   └── ...                      # Ver docs/INDEX.md para listado completo
│
└── changelog/
    ├── v0.5.1.md
    ├── v0.5.0.md
    └── ...
```

---

## Convenciones de Documentos

### Tipos de Documentos

| Tipo | Icono | Propósito | Ejemplos |
|------|-------|-----------|----------|
| **Canónico** | 📜 | Fuente de verdad. Define comportamiento esperado. | ARCHITECTURE.md, MCP_TOOLS.md |
| **Resumen** | 📋 | Sintetiza información y apunta a documentos canónicos | INDEX.md, ARCHETYPE_SYSTEM.md |
| **Guía** | 📖 | Instrucciones paso a paso | GETTING_STARTED.md, DOCUMENTATION_GUIDE.md |
| **Historico** | 📚 | Contexto historico. No usar para decisiones actuales. | REFACTOR_PLAN.md |
| **Changelog** | 📝 | Registro de cambios por versión | changelog/v0.5.1.md |

### Encabezado de Documentos

Cada documento debe comenzar con:

```markdown
# Título del Documento

**Versión**: vX.Y.Z  
**Última actualización**: YYYY-MM-DD

---
```

### Estados de Contenido

Usar emojis para indicar estado:

| Emoji | Significado | Uso |
|-------|-------------|-----|
| ✅ | Completado/Verificado | Features implementados |
| 🏗️ | En progreso | Trabajo activo |
| ⏭️ | Planificado | En roadmap |
| ❌ | No aplica/Descartado | Features rechazados |
| 📝 | Borrador | Documento en desarrollo |

---

## Actualización de Documentación

### Cuándo Actualizar

**Siempre actualizar documentación cuando**:

1. Se completa una nueva fase (actualizar ROADMAP.md)
2. Se refactoriza código (actualizar ARCHITECTURE.md)
3. Se añaden/renombran módulos (actualizar docs/INDEX.md)
4. Se crea un nuevo changelog (actualizar CHANGELOG.md)
5. Cambia la API pública (actualizar MCP_TOOLS.md, README.md)

### Checklist de Actualización de Versión

Al lanzar una nueva versión (ej: v0.6.0):

```markdown
- [ ] Crear changelog/v0.6.0.md con cambios detallados
- [ ] Actualizar CHANGELOG.md con enlace a nueva versión
- [ ] Actualizar versión en README.md
- [ ] Actualizar versión en ROADMAP.md
- [ ] Actualizar versión en GETTING_STARTED.md
- [ ] Actualizar docs/INDEX.md si hay nueva arquitectura
- [ ] Actualizar estado de fases en ROADMAP.md
- [ ] Verificar consistencia de números (módulos, líneas, etc.)
```

### Numeración Consistente

**Reglas críticas**:

1. **Número de módulos**: Usar el conteo real de módulos en src/
   - Actual: 147 módulos
   - Comando: `find src -name "*.js" -not -path "*node_modules*" | wc -l`

2. **Número de archivos refactorizados**: 17 monolitos → 147 módulos

3. **Porcentajes de completitud**: Basarse en la definición de "completado" del ROADMAP

4. **Tamaño promedio**: 453 → 52 líneas (89% reducción)

---

## Anti-Patrones a Evitar

### ❌ Documentación Duplicada

**Problema**: Múltiples archivos con información similar.

**Ejemplo anterior (corregido)**:
- ~~ROADMAP.md~~
- ~~ROADMAP2.MD~~ (eliminado)
- ~~ROADMAP3.md~~ (eliminado)

**Solución**: Consolidar en un solo ROADMAP.md.

### ❌ Información Desactualizada

**Problema**: Documento dice "Próximo paso: Implementar Capa A" cuando ya está implementada.

**Ejemplo**: GETTING_STARTED.md antes de v0.5.1.

**Solución**: Actualizar con cada release.

### ❌ Inconsistencia de Números

**Problema**: Un documento dice "99+ módulos" y otro "147 módulos".

**Solución**: Usar variables o buscar y reemplazar globalmente.

### ❌ Documentos Huérfanos

**Problema**: Archivos no referenciados en INDEX.md.

**Solución**: Cada nuevo documento debe añadirse a docs/INDEX.md.

---

## Plantillas

### Plantilla de Changelog

```markdown
# Changelog vX.Y.Z - Nombre de Release

**Fecha**: YYYY-MM-DD

## Overview

Breve descripción de la release.

## Cambios Principales

### ✅ Nuevos Features
- [x] Feature 1
- [x] Feature 2

### 🔧 Mejoras
- [x] Mejora 1
- [x] Mejora 2

### 🐛 Bug Fixes
- [x] Fix 1

## Estadísticas

| Métrica | Valor |
|---------|-------|
| Archivos modificados | X |
| Líneas añadidas | +X |
| Líneas eliminadas | -X |
| Módulos afectados | X |

## Breaking Changes

Lista de cambios que rompen compatibilidad.

## Migración

Instrucciones para migrar desde versiones anteriores.
```

### Plantilla de Sección de Arquitectura

```markdown
## Nombre del Componente

### Responsabilidad
Una oración describiendo QUÉ hace este componente.

### Estructura
```
component/
├── index.js           # Facade - API pública
├── constants.js       # SSOT - Constantes
├── module-a.js        # Funcionalidad A
├── module-b.js        # Funcionalidad B
└── utils/
    └── helpers.js     # Utilidades
```

### Interfaz Pública

| Función | Descripción |
|---------|-------------|
| `functionA()` | Hace X |
| `functionB()` | Hace Y |

### Dependencias
- Depende de: `module-x`, `module-y`
- Usado por: `module-z`
```

---

## Proceso de Review de Documentación

### Self-Review Checklist

Antes de commit:

```markdown
- [ ] Versión actualizada en encabezado
- [ ] Fecha de actualización correcta
- [ ] Links funcionan (no rotos)
- [ ] Numeración consistente con otros docs
- [ ] Nuevo documento añadido a INDEX.md
- [ ] Sin typos obvios
- [ ] Formato Markdown válido
```

### Review de Pares

Para cambios significativos:

1. Otro miembro del equipo revisa
2. Verifica consistencia con otros documentos
3. Aprueba o solicita cambios

---

## Glosario

Términos consistentes a usar:

| Término | Definición | Uso |
|---------|------------|-----|
| **Módulo** | Archivo JavaScript enfocado en una responsabilidad | "El módulo path-utils.js" |
| **Facade** | index.js que exporta API pública de un directorio | "El facade de graph/" |
| **SSOT** | Single Source of Truth | "SSOT para path normalization" |
| **Capa A** | Análisis estático | "La Capa A extrae imports/exports" |
| **Capa B** | Análisis semántico con IA | "La Capa B enriquece con LLM" |
| **Capa C** | Memoria persistente | "La Capa C almacena en JSON" |

---

## Herramientas

### Verificación de Links

```bash
# Buscar posibles links rotos (archivos referenciados que no existen)
grep -r "\[.*\](.*)" docs/ --include="*.md" | grep -v "http"
```

### Verificación de Consistencia

```bash
# Buscar menciones de versión inconsistentes
grep -r "v0\.[0-9]\.[0-9]" *.md docs/*.md

# Buscar menciones de números de módulos
grep -r "[0-9]\+ módulos\|[0-9]\+ modules" *.md docs/*.md
```

---

## Referencias

- [README.md](../README.md)
- [docs/INDEX.md](INDEX.md)
- [ROADMAP.md](../ROADMAP.md)

---

*Esta guía debe actualizarse cuando cambien las convenciones del proyecto.*
