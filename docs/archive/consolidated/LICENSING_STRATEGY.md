---
?? **DOCUMENTO DE IDEAS / REFERENCIA**

Este documento contiene ideas exploratorias o material de referencia.
Para documentación actual, ver docs/01-core/, docs/04-guides/, o docs/05-roadmap/

---
# Estrategia de Licencias - OmnySys

**Status**: Decision pendiente
**Origen**: Conversacion con Gemini (2026-02-08)
**Tipo**: Decision de negocio

---

## Situacion Actual

OmnySys usa licencia **MIT** (extremadamente permisiva). Esto permite que cualquier empresa tome el codigo, lo modifique y lo venda sin devolver nada.

## Opciones Evaluadas

| Licencia | Proteccion | Open Source? | Riesgo |
|----------|-----------|-------------|--------|
| **MIT** (actual) | Minima | Si, total | Big Tech puede apropiarse |
| **AGPLv3** | Fuerte copyleft | Si, con condiciones | Empresas deben compartir mejoras si lo usan en la nube |
| **BSL 1.1** | Comercial | Codigo visible, uso comercial requiere licencia | Bueno para monetizar |
| **Dual Licensing** | Flexible | GPL para comunidad, comercial para empresas | Modelo probado (MySQL, MongoDB) |

## Recomendacion (de Gemini)

**AGPLv3** si el objetivo es:
- Mantener Open Source
- Obligar a que Big Tech comparta mejoras
- Proteger contra servicios cloud cerrados basados en OmnySys

**BSL 1.1** si el objetivo es:
- Monetizar uso corporativo
- Mantener codigo visible para la comunidad
- Transicion a open source completo despues de X anos

## Consideraciones

1. El copyright (Mauro Ramirez 2026) y el historial de Git prueban autoria original
2. La licencia protege el CODIGO, no la IDEA (atomos/moleculas como concepto)
3. Cambiar licencia solo aplica a commits futuros; el codigo ya publicado bajo MIT sigue siendo MIT
4. Consultar con un abogado de propiedad intelectual antes de cambiar

## Decision

**Pendiente** - Mauro debe evaluar objetivos de negocio vs comunidad.

