# Casos de Visión de Túnel - Análisis Completo

Documento que lista TODOS los casos donde un desarrollador/IA puede tener "visión de túnel" al editar código, y qué información necesita el sistema para prevenirlos.

---

## ✅ IMPLEMENTADOS (Sistema actual)

### 1. Dependencias Estáticas (Imports/Exports)
**Problema**: Cambiar una exportación rompe importadores  
**Ejemplo**: Renombrar `export function fetchData()` → `export function fetchUsers()`  
**Solución**: Análisis AST + grafo de dependencias  
**Estado**: ✅ Implementado en Layer A

### 2. localStorage / sessionStorage
**Problema**: Cambiar key rompe lectura en otro archivo  
**Ejemplo**: `setItem('token', ...)` ↔ `getItem('auth_token')`  
**Solución**: Regex + detección de keys compartidas  
**Estado**: ✅ static-extractors.js

### 3. Eventos DOM / CustomEvents
**Problema**: Renombrar evento rompe listeners  
**Ejemplo**: `emit('userLogin')` vs `on('userLoggedIn')`  
**Solución**: Regex + mapeo de emisores/oyentes  
**Estado**: ✅ static-extractors.js

### 4. Variables Globales (window.*)
**Problema**: Cambiar propiedad global afecta múltiples archivos  
**Ejemplo**: `window.eventBus = ...` usado en 5 archivos  
**Solución**: Regex + tracking de reads/writes  
**Estado**: ✅ static-extractors.js

### 5. Web Workers
**Problema**: Cambiar estructura de mensajes rompe worker  
**Ejemplo**: Main envía `{type: 'START'}` pero worker espera `{action: 'begin'}`  
**Solución**: Detección de postMessage + validación de workers  
**Estado**: ✅ advanced-extractors.js

### 6. BroadcastChannel
**Problema**: Cambiar nombre de canal desconecta pestañas  
**Ejemplo**: Canal `'app_sync'` vs `'app-sync'`  
**Solución**: Detección de new BroadcastChannel()  
**Estado**: ✅ advanced-extractors.js

### 7. WebSocket
**Problema**: Múltiples archivos conectan a mismo WS, cambiar uno afecta a todos  
**Ejemplo**: Chat app con conexiones dispersas  
**Solución**: Detección de URLs WS compartidas  
**Estado**: ✅ advanced-extractors.js

### 8. API Endpoints Compartidos
**Problema**: Cambiar contrato de API rompe todos los callers  
**Ejemplo**: `fetch('/api/users')` en 3 archivos, cambiar a POST rompe todo  
**Solución**: Detección de URLs de fetch/XHR  
**Estado**: ✅ advanced-extractors.js

### 9. Conexiones Rotas
**Problema**: Worker apunta a archivo inexistente  
**Ejemplo**: `new Worker('./missing.js')`  
**Solución**: Validación de rutas + reporte de errores  
**Estado**: ✅ broken-connections-detector.js

### 10. Código Muerto (Dead Functions)
**Problema**: Función nunca llamada, segura de eliminar?  
**Ejemplo**: Función privada no usada desde hace meses  
**Solución**: Análisis de usos + export status  
**Estado**: ✅ broken-connections-detector.js

### 11. Funciones Duplicadas
**Problema**: Misma función en múltiples archivos, consolidar?  
**Ejemplo**: `formatDate()` en 3 archivos diferentes  
**Solución**: Indexado de nombres de función  
**Estado**: ✅ broken-connections-detector.js

---

## 🚧 PENDIENTES (Alta Prioridad)

### 12. CSS-in-JS / Styled Components
**Problema**: Cambiar estilo rompe componentes que dependen de clase  
**Ejemplo**: `styled.div` cambia nombre de clase generada  
**Ejemplo**: ThemeProvider cambia valores, afecta todos los componentes  
**Detección necesaria**:
- Tagged template literals (`styled.div`...)
- Theme objects compartidos
- Class names dinámicas
**Impacto**: ⭐⭐⭐⭐⭐ (Muy común en React)

### 13. TypeScript Types / Interfaces
**Problema**: Cambiar interface rompe todos los implementadores  
**Ejemplo**: Agregar campo requerido a interface User  
**Detección necesaria**:
- AST de TypeScript
- References de tipos
- Herencia de interfaces
**Impacto**: ⭐⭐⭐⭐⭐ (Crítico en TS)

### 14. Redux / Context Selectors
**Problema**: Cambiar estructura de estado rompe selectores  
**Ejemplo**: `state.user.name` → `state.user.profile.name`  
**Detección necesaria**:
- Mapeo de selectores por archivo
- Estructura del store
- Usage de useSelector
**Impacto**: ⭐⭐⭐⭐⭐ (Muy común)

### 15. GraphQL Fragments
**Problema**: Cambiar fragmento afecta todos los componentes que lo usan  
**Ejemplo**: Fragmento UserFields usado en 10 componentes  
**Detección necesaria**:
- Parseo de GraphQL
- Fragment dependencies
- Query composition
**Impacto**: ⭐⭐⭐⭐ (Si usa GraphQL)

### 16. Middleware / Interceptors
**Problema**: Cambiar middleware rompe cadena de procesamiento  
**Ejemplo**: Express middleware que valida auth, cambiar orden rompe todo  
**Detección necesaria**:
- Cadena de middlewares
- Orden de ejecución
- Dependencies entre middlewares
**Impacto**: ⭐⭐⭐⭐ (Backend)

### 17. Feature Flags
**Problema**: Código habilitado por flag, cambiar flag afecta flujo  
**Ejemplo**: `if (flags.newFeature) { ... }`  
**Detección necesaria**:
- Referencias a flags
- Código condicional por flag
- Valores default de flags
**Impacto**: ⭐⭐⭐ (Depende del proyecto)

---

## 📋 LISTA EXTENDIDA (Media/Baja Prioridad)

### 18. i18n / Translation Keys
**Problema**: Renombrar key de traducción rompe UI  
**Ejemplo**: `t('user.title')` vs `t('user.name')`  
**Solución**: Tracking de keys usadas

### 19. Storybook Stories
**Problema**: Cambiar props de componente rompe stories  
**Ejemplo**: Agregar prop requerida, stories no la pasan  
**Solución**: Análisis de stories + props

### 20. Test Files
**Problema**: Tests dependen de implementación interna  
**Ejemplo**: Cambiar nombre de función privada rompe tests  
**Solución**: Mapeo de tests a implementación

### 21. Mocks / Stubs
**Problema**: Mocks deben actualizarse con implementación real  
**Ejemplo**: Mock de API desactualizado respecto a backend real  
**Solución**: Comparación mock vs real

### 22. Assets / Imports de Imágenes
**Problema**: Cambiar ruta de imagen rompe imports  
**Ejemplo**: `import logo from './logo.png'`  
**Solución**: Tracking de imports de assets

### 23. Configuración de Build
**Problema**: Cambios en vite.config/webpack afectan runtime  
**Ejemplo**: Cambiar alias de imports  
**Solución**: Análisis de config + validación

### 24. Polyfills
**Problema**: Polyfills modifican comportamiento global  
**Ejemplo**: Polyfill de Promise que cambia API  
**Solución**: Tracking de polyfills cargados

### 25. Service Workers
**Problema**: Caching strategies afectan fetching de recursos  
**Ejemplo**: Cambiar versión de cache rompe offline  
**Solución**: Análisis de service worker + rutas cacheadas

### 26. WebAssembly Imports
**Problema**: Cambiar WASM requiere recompilar  
**Ejemplo**: Funciones exportadas por WASM cambian  
**Solución**: Tracking de imports WASM

### 27. Decorators / Metadata
**Problema**: Decorators afectan comportamiento en runtime  
**Ejemplo**: `@Controller()` en NestJS  
**Solución**: AST analysis de decorators

### 28. Inyección de Dependencias
**Problema**: Cambiar provider afecta todos los inyectores  
**Ejemplo**: Angular services, InversifyJS  
**Solución**: Grafo de inyección

### 29. Regex Compartidas
**Problema**: Cambiar patrón regex afecta múltiples usos  
**Ejemplo**: Constante REGEX_EMAIL usada en validaciones  
**Solución**: Tracking de constantes regex

### 30. Magic Numbers / Constants
**Problema**: Cambiar valor de constante afecta toda la app  
**Ejemplo**: `const MAX_ITEMS = 10` usado en paginación  
**Solución**: Tracking de constantes exportadas

---

## 🎯 "Árbol Genealógico" Completo de un Archivo

Para tener visión COMPLETA de un archivo, necesitamos:

```typescript
interface FileGenealogy {
  // Identidad
  path: string;
  exports: Export[];
  imports: Import[];
  
  // Dependencias directas
  dependsOn: string[];  // Archivos que importa
  usedBy: string[];     // Archivos que lo importan
  
  // Conexiones semánticas
  localStorage: { key: string, operation: 'read'|'write' }[];
  events: { name: string, role: 'emitter'|'listener' }[];
  globals: { property: string, operation: 'read'|'write' }[];
  workers: { workerPath: string, messages: string[] }[];
  webSockets: { url: string }[];
  broadcastChannels: { channel: string }[];
  apiCalls: { endpoint: string, method: string }[];
  
  // Impacto
  riskScore: number;
  isHotspot: boolean;   // Usado por muchos archivos
  isOrphan: boolean;    // No usado por nadie
  
  // Issues
  brokenConnections: BrokenConnection[];
  deadCode: Function[];
  duplicates: DuplicateFunction[];
  suspiciousPatterns: Pattern[];
  
  // Contexto
  functions: Function[];
  classes: Class[];
  types: TypeDefinition[];  // TypeScript
  tests: Test[];            // Tests relacionados
  stories: Story[];         // Storybook stories
  
  // Metadatos
  lastModified: Date;
  complexity: number;
  linesOfCode: number;
}
```

---

## 📊 Matriz de Implementación

| Caso | Dificultad | Impacto | Prioridad | Estado |
|------|-----------|---------|-----------|--------|
| Imports/Exports | ⭐ | ⭐⭐⭐⭐⭐ | P0 | ✅ |
| localStorage | ⭐ | ⭐⭐⭐⭐ | P1 | ✅ |
| Eventos | ⭐ | ⭐⭐⭐⭐ | P1 | ✅ |
| Variables globales | ⭐ | ⭐⭐⭐ | P2 | ✅ |
| Web Workers | ⭐⭐ | ⭐⭐⭐⭐ | P1 | ✅ |
| CSS-in-JS | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P0 | 🚧 |
| TypeScript Types | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P0 | 🚧 |
| Redux/Context | ⭐⭐ | ⭐⭐⭐⭐⭐ | P0 | 🚧 |
| GraphQL | ⭐⭐⭐ | ⭐⭐⭐⭐ | P1 | 🚧 |
| Middleware | ⭐⭐ | ⭐⭐⭐⭐ | P2 | 🚧 |
| i18n | ⭐ | ⭐⭐⭐ | P2 | 📋 |
| Tests | ⭐⭐ | ⭐⭐⭐ | P2 | 📋 |
| Storybook | ⭐⭐ | ⭐⭐ | P3 | 📋 |

**Leyenda**:
- ✅ Implementado
- 🚧 En progreso / Alta prioridad
- 📋 Pendiente

---

## 💡 Próximos Pasos Recomendados

### Fase 1 (Inmediata): Robustecer lo existente
1. Tests completos para todos los extractores
2. Integrar cache inteligente al indexer
3. Validar con proyectos reales

### Fase 2 (Corto plazo): CSS-in-JS y TypeScript
1. Parser de styled-components / emotion
2. AST de TypeScript para interfaces
3. Detección de selectors de Redux

### Fase 3 (Medio plazo): GraphQL y más
1. Parser de GraphQL
2. Análisis de middlewares
3. Feature flags tracking

### Fase 4 (Largo plazo): IDE Integration
1. Extensión VSCode
2. Language server protocol
3. Autocompletado con contexto

---

## 🤔 ¿Qué opinás?

¿Cuáles de estos casos son más críticos para tu flujo de trabajo? ¿Hay algún caso que no haya considerado?
