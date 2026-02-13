# Clarificación de Fases: Extracción vs Entrenamiento

**Fecha**: 2026-02-09  
**Estado Actual**: Fases 0-2 (Extracción y Estructuración)

---

## 🎯 Fases del Proyecto (Clarificación)

### ✅ AHORA (Fases 0-2): Extracción y Estructuración

**Objetivo**: Construir el ecosistema de metadatos y conexiones.

**Qué hacemos**:
- Extraer ADN de los átomos
- Crear Shadow Registry
- Detectar conexiones (temporal, type, error, performance)
- Validar metadatos
- Enriquecer con ancestry

**NO hacemos**:
- ❌ Entrenar ML
- ❌ Predecir comportamiento
- ❌ Sugerir código automáticamente

**Los datos se usan para**:
- Mostrar contexto al desarrollador
- Validar conexiones existentes
- Detectar patrones actuales (no predecir futuros)

---

### 🔮 DESPUÉS (Fase 3+): Entrenamiento y Predicción

**Cuándo**: Cuando tengamos suficientes datos (1000+ sombras, 6+ meses de historia)

**Qué haremos**:
- Entrenar modelos pequeños con los datos del Shadow Registry
- Predecir: "Esta función probablemente necesite X"
- Sugerir: "Considera agregar validación basado en el clan"

**Requisitos para llegar ahí**:
- Sistema estable funcionando (Fases 0-2 completas)
- Dataset grande de evoluciones
- Benchmarks validados

---

## 📝 Nota sobre los Documentos

Los documentos mencionan "predicción" y "ML" en dos contextos:

### 1. **Patrones Históricos** (Fases 0-2) ✅

```javascript
// Esto SÍ hacemos ahora:
"El 67% de funciones del clan 'read-transform-persist' 
 tienen validación. Tu función no la tiene."

// Es ESTADÍSTICA descriptiva, no ML.
// Contamos lo que existe, no predecimos lo que vendrá.
```

### 2. **Predicción ML** (Fase 3+) 🔮

```javascript
// Esto NO hacemos todavía:
"Basado en el patrón, PREDIGO que necesitarás 
 agregar validación en 2 semanas."

// Esto requiere modelo entrenado, que no tenemos aún.
```

---

## 🎨 Ejemplo de Presentación (Fase 0-2 vs Fase 3)

### Fase 0-2 (AHORA): Estadística Descriptiva

```
📊 DATOS DEL CLAN:
Tu función pertenece al clan "read-transform-persist"
(127 funciones similares)

📈 PATRONES DETECTADOS:
• 67% tienen validación
• 45% extrajeron persistencia
• 80% tienen tests de integración

💡 OBSERVACIÓN:
Tu función NO tiene validación (sos del 33%)
```

### Fase 3 (DESPUÉS): ML Predictivo

```
🤖 PREDICCIÓN:
Basado en 200 evoluciones similares:

• Probabilidad de agregar validación: 67%
• Tiempo estimado: 2-4 semanas
• Riesgo de bug sin validación: Alto

✅ SUGERENCIA:
Considera agregar validación AHORA, antes de que 
la complejidad crezca.
```

**Diferencia clave**: Fase 0-2 describe lo que ES. Fase 3 predice lo que SERÁ.

---

## ✅ Estado Actual del Proyecto

**Completado (Fases 0-2)**:
- ✅ Shadow Registry
- ✅ DNA Extraction
- ✅ Conexiones temporales, type, error, performance
- ✅ Ancestry y vibration
- ✅ Validación de metadatos

**Pendiente (Fase 3+)**:
- 🔮 ML Training
- 🔮 Predicciones
- 🔮 Sugerencias automáticas

---

## 🎯 Próximo Trabajo (Fases 0-2)

1. **Terminar de estructurar** el ecosistema de conexiones
2. **Validar** que todas las conexiones funcionan correctamente
3. **Documentar** cómo presentar los datos (sin ML)
4. **Tests** de integración

**NO empezamos**:
- ❌ Dataset collection para ML
- ❌ Model training
- ❌ Predicciones

Eso viene cuando el sistema base esté estable y tengamos datos suficientes.
