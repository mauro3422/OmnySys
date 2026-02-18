# 🛡️ Seguridad: Auto-Fix Deshabilitado por Defecto

**Fecha**: 2026-02-14  
**Versión**: v0.9.4  
**Commit**: Inmediato

---

## ⚠️ El Problema

El sistema de **auto-fix** del Error Guardian podría sobrescribir cambios de código humanos accidentalmente:

```javascript
// Escenario de riesgo:
1. Vos hacés cambios importantes en el código
2. Ocurre un error que el sistema detecta como "auto-fixeable"
3. ErrorGuardian aplica un "fix" automático
4. Tus cambios DESAPARECEN 😱
```

---

## ✅ La Solución

**Auto-fix está DESHABILITADO por defecto** en v0.9.4+:

```javascript
// Por defecto - SEGURO ✅
const guardian = new ErrorGuardian(projectPath);
// enableAutoFix: false (implícito)

// Para habilitar - EXPLÍCITO ⚠️
const guardian = new ErrorGuardian(projectPath, {
  enableAutoFix: true  // Debes activarlo manualmente
});
```

---

## 📝 Comportamiento Actual

### Cuando auto-fix está DESACTIVADO (default):
```javascript
// En logs verás:
💡 Auto-fix available but DISABLED for safety.
   To enable: new ErrorGuardian(path, { enableAutoFix: true })
   Suggested fix: <descripción del fix>
```

### Cuando auto-fix está ACTIVADO:
```javascript
// En logs verás:
⚠️  Auto-fix is ENABLED. This may overwrite your code changes.
   Make sure you have committed your changes to git before continuing.
🔧 Intentando auto-fix...
✅ Auto-fix exitoso. Sistema estabilizado.
```

---

## 🚀 Cuándo Usar Auto-Fix

### ✅ Seguro usar cuando:
- Estás en un entorno de desarrollo controlado
- Tenés commits recientes en git
- Estás probando el sistema
- Los errores son de infraestructura (cache, logs), no de lógica

### ❌ NO usar cuando:
- Estás haciendo cambios críticos en producción
- No tenés backup de tu código
- No entendés qué es el error que está intentando fixear
- Estás en modo "debugging" de un problema complejo

---

## 🔄 Migración para Usuarios Existentes

Si tenías código que dependía del auto-fix:

```javascript
// Antes (v0.9.3 y anteriores):
const guardian = new ErrorGuardian(projectPath);
// Auto-fix funcionaba automáticamente

// Ahora (v0.9.4+):
const guardian = new ErrorGuardian(projectPath, {
  enableAutoFix: true  // Debes agregar esto explícitamente
});
```

---

## 🛠️ Recomendaciones

### 1. Usar con Git
```bash
# Antes de habilitar auto-fix:
git add .
git commit -m "Backup antes de auto-fix"

# Ahora podés habilitar auto-fix con confianza
```

### 2. Modo Dry-Run (Futuro)
En una versión futura se agregará:
```javascript
const guardian = new ErrorGuardian(projectPath, {
  enableAutoFix: true,
  dryRun: true  // Solo muestra qué haría, no lo ejecuta
});
```

### 3. Whitelist de archivos (Futuro)
```javascript
const guardian = new ErrorGuardian(projectPath, {
  enableAutoFix: true,
  autoFixWhitelist: [
    '.omnysysdata/cache/*',  // Solo archivos seguros
    'logs/*'
    // NUNCA src/**/*.js
  ]
});
```

---

## 📝 Notas Técnicas

### Cambios realizados:
1. `ErrorGuardian.constructor()`: Agregado `enableAutoFix: false` por defecto
2. `handleFatalError()`: Verificación explícita de `this.options.enableAutoFix`
3. `logger.info()`: Mensaje informativo cuando hay fix disponible pero deshabilitado
4. `logger.warn()`: Advertencia cuando se habilita explícitamente

### Archivos modificados:
- `src/core/error-guardian/guardian/ErrorGuardian.js`

---

## ✅ Checklist de Seguridad

- [x] Auto-fix deshabilitado por defecto
- [x] Advertencia al habilitar explícitamente
- [x] Mensaje informativo de fix disponible
- [x] Documentación de migración
- [ ] Tests de seguridad (pendiente)
- [ ] Modo dry-run (futuro)
- [ ] Whitelist de archivos (futuro)

---

**Prioridad**: 🔴 CRÍTICA  
**Impacto**: Previene pérdida de código  
**Backward Compatible**: ✅ Sí (cambio de comportamiento por seguridad)
