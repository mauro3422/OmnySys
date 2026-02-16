# PLAN SISTEMÁTICO - MIGRACIÓN TOTAL LAYER A

**Inicio:** 2026-02-16 02:10 AM  
**Objetivo:** Migrar los 655 archivos de test de Layer A al Meta-Factory  
**Metodología:** Batch processing con registro detallado

---

## 📋 FASES DEL PLAN

### FASE 1: Análisis Completo (15 min)
- [ ] Identificar todos los archivos que necesitan migración
- [ ] Clasificar por tipo (analyses, extractors, graph, parser, etc.)
- [ ] Identificar patrones comunes
- [ ] Crear scripts de migración específicos

### FASE 2: Analyses (Completo) (30 min) ✅
- [x] Tier 1 (6 archivos) - 100% 
- [x] Tier 2 (10 archivos) - 100%
- [x] Tier 3 (10 archivos) - 100%
- [x] Sub-módulos (calculators, detectors, factors, etc.)

### FASE 3: Core Infrastructure (45 min)
- [ ] analyzer.test.js
- [ ] indexer.test.js
- [ ] scanner.test.js
- [ ] resolver.test.js
- [ ] helpers.test.js
- [ ] graph builders
- [ ] module system

### FASE 4: Parser System (60 min)
- [ ] parser/*.test.js
- [ ] parser/extractors/*.test.js
- [ ] parser/helpers.test.js

### FASE 5: Extractors Masivos (90 min)
- [ ] extractors/atomic/*.test.js
- [ ] extractors/communication/*.test.js
- [ ] extractors/css-in-js-extractor/*.test.js
- [ ] extractors/data-flow/**/*.test.js
- [ ] extractors/metadata/*.test.js
- [ ] extractors/typescript/*.test.js

### FASE 6: Graph System (45 min)
- [ ] graph/*.test.js
- [ ] graph/builders/*.test.js
- [ ] graph/algorithms/*.test.js
- [ ] graph/resolvers/*.test.js

### FASE 7: Module System (45 min)
- [ ] module-system/*.test.js
- [ ] module-system/**/*.test.js

### FASE 8: Race Detector (45 min)
- [ ] race-detector/**/*.test.js

### FASE 9: Storage & Others (30 min)
- [ ] storage/**/*.test.js
- [ ] pipeline/**/*.test.js
- [ ] query/*.test.js
- [ ] pattern-detection/*.test.js

### FASE 10: Verificación Final (30 min)
- [ ] Ejecutar suite completa
- [ ] Contar tests con Meta-Factory
- [ ] Verificar 0 vi.mock
- [ ] Documentar resultado final

---

## 📝 REGISTRO DE PROGRESO

| Fase | Área | Archivos | Estado | Tests Pass |
|------|------|----------|--------|------------|
| 2 | Analyses | 26+ | ✅ 100% | 138/138 |
| 3 | Core | - | ⏳ Pendiente | - |
| 4 | Parser | - | ⏳ Pendiente | - |
| 5 | Extractors | - | ⏳ Pendiente | - |
| 6 | Graph | - | ⏳ Pendiente | - |
| 7 | Module System | - | ⏳ Pendiente | - |
| 8 | Race Detector | - | ⏳ Pendiente | - |
| 9 | Storage/Others | - | ⏳ Pendiente | - |

---

## 🔄 PROCESO DE MIGRACIÓN POR ARCHIVO

Para cada archivo:
1. Leer contenido actual
2. Identificar imports de #layer-a
3. Detectar función principal a testear
4. Generar estructura Meta-Factory
5. Preservar specificTests si existen (cambiando `test:` por `fn:`)
6. Agregar `expectedSafeResult` si es necesario
7. Verificar que no quede `vi.mock`
8. Guardar con backup
9. Ejecutar test para verificar
10. Registrar en log

---

**Estado actual:** Iniciando FASE 3 - Core Infrastructure
**Archivos procesados:** 26/655 (4%)
**Hora:** 02:10 AM
