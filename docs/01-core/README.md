# README - 01-core

**Fundamentos de OmnySys**

Esta carpeta contiene los **fundamentos filosóficos y técnicos** del sistema OmnySys.

---

## 📚 Documentos en esta Carpeta

| Documento | Descripción | Tiempo de Lectura |
|-----------|-------------|-------------------|
| [problem.md](./problem.md) | **El Problema**: Visión de túnel en IAs | 10 min |
| [principles.md](./principles.md) | **Los 4 Pilares**: Box Test, Metadata Insights, Atomic Composition, Fractal | 15 min |
| [philosophy.md](./philosophy.md) | **La Filosofía**: Física del software + Omnisciencia | 20 min |

---

## 🎯 Orden Recomendado de Lectura

```
1. problem.md      → Entender QUÉ problema resolvemos
2. principles.md   → Entender CÓMO lo resolvemos (técnico)
3. philosophy.md   → Entender POR QUÉ lo resolvemos (visión)
```

---

## 🔑 Conceptos Clave

### 1. Visión de Túnel
Las IAs que editan código sin ver el contexto completo causan bugs colaterales. OmnySys resuelve esto con **memoria externa persistente**.

### 2. Los 4 Pilares
- **Box Test**: Solo arquetipos que revelan conexiones entre archivos
- **Metadata Insights**: Cross-referenciar metadata para encontrar patrones
- **Atomic Composition**: Archivos (moléculas) compuestos de funciones (átomos)
- **Fractal Architecture**: El mismo patrón se repite en todas las escalas

### 3. Física del Software
Modelamos el software como un sistema físico:
- **Átomos** = Funciones
- **Moléculas** = Archivos
- **Electrones** = Flujo de datos
- **Enlaces químicos** = Llamadas entre funciones

---

## 📊 Estado Actual (v0.9.61)

```
┌─────────────────────────────────────────────────────────────┐
│  OMNYSYS v0.9.61 — Estado del Sistema                     │
├─────────────────────────────────────────────────────────────┤
│  Átomos:         13,485 funciones analizadas              │
│  Archivos:       1,860                                    │
│  Health Score:   99/100 (Grade A)                        │
│  Test Coverage:  79%                                      │
│  God Functions:  193 (complejidad > 15)                  │
│  Dead Code:      42 casos (85% menos falsos positivos)   │
│  Duplicados:     118 exactos, 694 contextuales           │
│  Debt Arch:      15 archivos críticos                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚧 Próximamente

**Migración a Tree-sitter** (Q2 2026):
- Mejor detección de exports para arrow functions
- Análisis de tipos TypeScript más preciso
- Performance mejorado en proyectos grandes

---

## 🔗 Enlaces Relacionados

- [Índice General](../INDEX.md)
- [Guía de Herramientas MCP](../04-guides/tools.md)
- [Arquitectura Técnica](../02-architecture/core.md)
