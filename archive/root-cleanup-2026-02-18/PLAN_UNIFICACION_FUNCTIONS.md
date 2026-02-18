# PLAN DE UNIFICACIÓN ROBUSTA - Function Model SSOT

## 🎯 OBJETIVO
Eliminar duplicación de fuentes de datos y crear Single Source of Truth (SSOT) para funciones.

## 📊 PROBLEMA ACTUAL
```
Parser extrae:
  - function_links[]: 1252 links ✓ (COMPLETO)
  - functions{}: 614 funciones ✗ (INCOMPLETO - solo FunctionDeclaration)

Sistemas usan:
  - Legacy: usa functions{} → 0/100 (datos rotos)
  - V2: usa function_links[] → 99/100 (datos correctos)
  
RESULTADO: Caos, inconsistencia, túnel de visión
```

## ✅ SOLUCIÓN ARQUITECTÓNICA

### FASE 1: Extender Parser (CRÍTICO)
**Archivo**: `src/layer-a-static/parser/index.js`

Actualmente solo extrae:
- ✅ FunctionDeclaration
- ❌ ClassMethod (métodos de clase)
- ❌ ArrowFunctionExpression
- ❌ FunctionExpression

**Cambios**:
1. Añadir visitor para `ClassMethod`
2. Añadir visitor para `ArrowFunctionExpression`  
3. Añadir visitor para `FunctionExpression`
4. Unificar en `functions{}` con metadata completa

### FASE 2: Function Model Unificado (SSOT)
**Nuevo archivo**: `src/layer-a-static/models/function-model.js`

```javascript
// Modelo único de función
interface FunctionModel {
  id: string,                    // filePath::functionName
  name: string,
  type: 'declaration' | 'method' | 'arrow' | 'expression',
  className?: string,            // Si es método de clase
  filePath: string,
  line: number,
  endLine: number,
  isExported: boolean,
  isAsync: boolean,
  params: string[],
  complexity: number,
  // Relaciones
  calls: string[],               // IDs de funciones que llama
  calledBy: string[],            // IDs de funciones que la llaman
  // AST (para análisis profundo)
  ast: Object
}
```

### FASE 3: Adaptador Backward Compatible
**Archivo**: `src/layer-a-static/models/function-adapter.js`

Mantiene APIs legacy pero usa SSOT internamente:
- `systemMap.functions` → adaptado desde FunctionModel
- `systemMap.function_links` → generado desde FunctionModel

### FASE 4: Migración Gradual
1. **Parser** genera FunctionModel (nueva fuente única)
2. **Adapter** expone APIs legacy para compatibilidad
3. **Legacy** usa adapter (sin cambios de código)
4. **V2** migra a FunctionModel (mejor performance)

## 🏗️ ARQUITECTURA FINAL

```
┌─────────────────────────────────────────────────────────┐
│                    PARSER (index.js)                    │
│  Extrae TODOS los tipos de funciones del AST            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              FUNCTION MODEL (SSOT)                      │
│  src/layer-a-static/models/function-model.js            │
│  • Única fuente de verdad                               │
│  • 1800+ funciones completas                            │
│  • Relaciones calculadas                                │
└────────────────┬────────────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
┌──────────────┐    ┌─────────────────┐
│   ADAPTER    │    │      V2         │
│  (Legacy)    │    │  (Directo)      │
│              │    │                 │
│ • functions{}│    │ • Usa modelo    │
│ • fn_links[] │    │   directo       │
└──────────────┘    └─────────────────┘
```

## 📈 BENEFICIOS

1. **SSOT**: Una sola fuente de verdad
2. **No más túnel de visión**: Todos los sistemas ven los mismos datos
3. **Completo**: 1800+ funciones reales (no 614)
4. **Backward Compatible**: Legacy sigue funcionando sin cambios
5. **Performance**: V2 accede directo, sin adaptador

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Mitigación |
|--------|------------|
| Breaking changes | Adapter mantiene APIs legacy |
| Performance | Cache de FunctionModel |
| Complejidad | Documentación clara |
| Testing | Tests de integración |

## 🚀 IMPLEMENTACIÓN

### Paso 1: Extender Parser (30 min)
- Añadir visitors faltantes
- Probar con archivos de ejemplo
- Verificar que extrae ~1800 funciones

### Paso 2: Function Model (45 min)
- Crear modelo con interfaces
- Implementar queries (getById, getByFile, etc.)
- Tests unitarios

### Paso 3: Adapter (30 min)
- Adaptar functions{} legacy
- Adaptar function_links[] legacy
- Verificar backward compatibility

### Paso 4: Integración (15 min)
- Conectar parser → FunctionModel → Adapter
- Probar análisis completo
- Verificar score consistente

## ✅ CRITERIOS DE ÉXITO

- [ ] Parser extrae 1800+ funciones
- [ ] Legacy obtiene mismo score que V2
- [ ] No breaking changes
- [ ] Performance similar o mejor
- [ ] Documentación actualizada

## 📝 NOTAS

- NO eliminar código legacy
- ELIMINAR duplicación de datos
- MANTENER APIs existentes
- MEJORAR calidad de datos
