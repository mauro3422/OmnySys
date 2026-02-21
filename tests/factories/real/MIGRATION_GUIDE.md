/**
 * @fileoverview MIGRATION_GUIDE.md
 * 
 * Guia para migrar tests de mocks a factories reales
 * 
 * ANTES: Tests con mocks (fragiles, acoplados a implementacion)
 * DESPUES: Tests con factories reales (robustos, testean comportamiento)
 */

## Ejemplo de Migracion

### ANTES: Test con mocks (anti-patron)

```javascript
import { describe, it, expect, vi } from 'vitest';

// Mocks fragiles
vi.mock('#services/llm-service/index.js', () => ({
  LLMService: { getInstance: vi.fn() }
}));

vi.mock('#cli/utils/paths.js', () => ({
  exists: vi.fn(),
  repoRoot: '/fake/path'
}));

const { LLMService } = await import('#services/llm-service/index.js');
const { exists } = await import('#cli/utils/paths.js');

describe('aiLogic', () => {
  it('returns error when config missing', async () => {
    // Setup mock
    exists.mockResolvedValue(false);
    LLMService.getInstance.mockReturnValue(null);
    
    // Test
    const result = await aiLogic('start', { silent: true });
    
    // Assert sobre mocks, no sobre comportamiento real
    expect(exists).toHaveBeenCalledWith('/fake/path/.omnysysdata');
    expect(result.success).toBe(false);
  });
});
```

**Problemas:**
- El test sabe demasiado sobre implementacion interna
- Si cambia la estructura de directorios, el test falla
- No testea el comportamiento real, testea los mocks
- Fragil y dificil de mantener

---

### DESPUES: Test con factories reales

```javascript
import { describe, it, expect } from 'vitest';
import { withProject } from '../factories/real/index.js';
import { aiLogic } from '#cli/commands/ai.js';

describe('aiLogic', () => {
  it('returns error when config missing', async () => {
    // Crea un proyecto REAL sin configuracion
    await withProject('simple', async (project) => {
      // El proyecto existe en filesystem real
      // No hay mocks, es el sistema real
      
      const result = await aiLogic('start', { 
        silent: true,
        projectPath: project.path  // Usa el path real
      });
      
      // Assert sobre comportamiento real
      expect(result.success).toBe(false);
      expect(result.error).toContain('config');
      
      // Cleanup automatico al salir del callback
    });
  });
  
  it('starts successfully with valid config', async () => {
    await withProject('simple', async (project) => {
      // Crea configuracion real
      await project.fs.createFile('.omnysysdata/config.json', JSON.stringify({
        ai: { enabled: true }
      }));
      
      const result = await aiLogic('start', {
        silent: true,
        projectPath: project.path
      });
      
      expect(result.success).toBe(true);
    });
  });
});
```

**Ventajas:**
- Testea comportamiento real del sistema
- No depende de implementacion interna
- Mas robusto (si funciona en test, funciona en produccion)
- Facil de entender y mantener

---

## Patrones de Migracion

### 1. Mock de fs -> FileSystemFactory

```javascript
// ANTES
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('content')
}));

// DESPUES  
const fs = await FileSystemFactory.create();
await fs.createFile('test.txt', 'content');
// Usa fs.readFile real
```

### 2. Mock de proyecto -> ProjectFactory

```javascript
// ANTES
vi.mock('#core/project', () => ({
  getProjectRoot: vi.fn().mockReturnValue('/fake')
}));

// DESPUES
const project = await createTestProject('simple');
// project.path es un directorio real
```

### 3. Mock de respuesta HTTP -> Servidor real

```javascript
// ANTES
vi.mock('#services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: [] })
}));

// DESPUES (con servidor de test)
const server = await TestServer.create();
server.route('/api/data', { data: [] });
const response = await fetch(server.url + '/api/data');
```

---

## Checklist de Migracion

- [ ] Identificar tests con mocks innecesarios
- [ ] Reemplazar `vi.mock()` con factories reales
- [ ] Usar `withProject()` o `withSandbox()` para auto-cleanup
- [ ] Testear comportamiento, no implementacion
- [ ] Verificar que los tests siguen pasando
- [ ] Eliminar mocks obsoletos

---

## Factories Disponibles

### FileSystemFactory
Crea archivos y directorios reales en un sandbox temporal.

```javascript
import { FileSystemFactory } from './factories/real/filesystem.factory.js';

const fs = await FileSystemFactory.create();
await fs.createFile('src/index.js', 'export const x = 1;');
await fs.createProject('my-project', { ... });
const content = await fs.readFile('src/index.js');
await fs.cleanup();
```

### ProjectFactory  
Crea proyectos completos con estructura real.

```javascript
import { createTestProject, withProject } from './factories/real/project.factory.js';

// Opcion 1: Manual cleanup
const project = await createTestProject('complex');
// ... usar project
await project.cleanup();

// Opcion 2: Auto-cleanup
await withProject('simple', async (project) => {
  // ... usar project
  // cleanup automatico al finalizar
});
```

### Templates Disponibles
- `simple` - Proyecto basico
- `withImports` - Con imports/exports
- `withClasses` - Con clases ES6
- `asyncProject` - Con async/await
- `withSideEffects` - Con localStorage
- `withEvents` - Con eventos
- `complex` - Proyecto complejo tipo real

---

## Ejemplo Completo

Ver: `tests/examples/real-factory-example.test.js`
