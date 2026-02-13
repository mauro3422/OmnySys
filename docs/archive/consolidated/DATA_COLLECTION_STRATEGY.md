---
?? **DOCUMENTO DE IDEAS / REFERENCIA**

Este documento contiene ideas exploratorias o material de referencia.
Para documentación actual, ver docs/01-core/, docs/04-guides/, o docs/05-roadmap/

---
# Estrategia de Recoleccion de Datos para Modelos de Prediccion

**Status**: Idea / No implementado
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Media (requiere Phase 6 Beta Testing primero)

---

## Objetivo

Recolectar metadatos estructurales de millones de repositorios para entrenar el Semantic Pattern Engine (modelo pequeno ~350M parametros que predice conexiones en milisegundos).

## Estrategia

### Fase 1: Validacion Local
1. Usar `omnysys analyze` en 5-10 repositorios diversos (React, Node, Vue)
2. Verificar que los metadatos son correctos y utiles
3. Generar benchmarks de precision

### Fase 2: Repos Open Source
1. Procesar repositorios populares de GitHub
2. Extraer pares: `{fragmento_atomo} â†’ {conexion_molecula}`
3. NO procesar codigo fuente masivo, solo metadatos estructurales
4. Almacenar en formato normalizado (ver [Variable Standardization](VARIABLE_STANDARDIZATION.md))

### Fase 3: Opt-in Comunitario
1. Ofrecer version gratuita de OmnySys
2. Opcion opt-in para compartir metadatos anonimos
3. Los metadatos mejoran el "instinto" global del sistema

### Fase 4: Entrenamiento
1. Fine-tune modelo pequeno (LFM2-Extract ~350M) con los pares recolectados
2. El modelo predice conexiones en milisegundos (<10ms)
3. No escribe codigo, solo rellena tablas de metadatos

## Recursos Necesarios

- **Computacion**: Analisis estatico es liviano (no necesita GPU)
- **Storage**: Metadatos son compactos (~2MB por 400 archivos)
- **Nube**: Para volumen masivo, usar servicios cloud basicos
- **Local-first**: La recoleccion puede hacerse desde la PC del usuario

## Prerequisitos

- OmnySys estable (Phase 6 completada)
- Benchmarks validados
- [Variable Standardization](VARIABLE_STANDARDIZATION.md) implementada

