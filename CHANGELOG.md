# Changelog

## [Unreleased]

### Cambios Mayores

- **Eliminación de módulos de explainability**: Se han eliminado los siguientes archivos del compilador:
  - `src/shared/compiler/compiler-explainability-policy.js`
  - `src/shared/compiler/compiler-explainability-summary-helpers.js`
  - `src/shared/compiler/compiler-explainability-summary.js`
  
  Estos módulos eran responsables de la generación de explicaciones detalladas del compilador y han sido deprecados en favor de un enfoque más simplificado.

- **Mejoras en el sistema de folderización**: Se han realizado mejoras significativas en el sistema de folderización:
  - Mejora en el algoritmo de scoring de confianza para folderización
  - Optimización del análisis de estructura de directorios
  - Refactorización del índice de folderización

- **Refactorización del contrato de observabilidad**: Se ha modificado el contrato de observabilidad del compilador para mejorar la integración con sistemas externos.

- **Mejoras en la propagación de metadatos**: Se han optimizado los algoritmos de propagación de metadatos para mejorar el rendimiento.

- **Actualización de conformidad de extensiones canónicas**: Se ha actualizado el sistema de conformidad de extensiones canónicas para mejorar la consistencia.

- **Mejoras en la granularidad de superficies semánticas**: Se han refinado los algoritmos de granularidad de superficies semánticas.

- **Optimización de límites de servicio**: Se han mejorado los algoritvos de conformidad de límites de servicio.

- **Actualización de payload de resumen de estado**: Se ha modificado el payload de resumen de estado del compilador.

- **Mejoras en la conformidad de resúmenes**: Se han actualizado los algoritmos de conformidad de resúmenes.

- **Actualización de tests**: Se han actualizado los tests unitarios para el resumen de estado.

### Cambios Menores

- Se han modificado los guards de impacto por defecto del file watcher
- Se han actualizado los helpers de capa de contrato de superficie
- Se han optimizado los algoritmos de pureza semántica

### Versionado

**Versión Anterior**: v0.9.226
**Próxima Versión**: v0.9.227

### Notas de Desarrollo

Este release se enfoca en la simplificación del sistema de explainability y la mejora del rendimiento del compilador. Se han eliminado componentes que no eran esenciales para el funcionamiento principal del sistema.