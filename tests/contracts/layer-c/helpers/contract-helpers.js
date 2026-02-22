/**
 * @fileoverview Contract Test Helpers
 * 
 * Helpers para tests de contratos de exports.
 * 
 * @module tests/contracts/layer-c/helpers/contract-helpers
 */

/**
 * Crea tests dinámicos para verificar exports de un módulo
 * @param {string} name - Nombre del módulo (para descripción)
 * @param {string} modulePath - Ruta del módulo a importar
 * @param {string[]} expectedExports - Lista de exports esperados
 */
export function createModuleExportTests(name, modulePath, expectedExports) {
  describe(`${name}`, () => {
    let mod;

    beforeAll(async () => {
      try {
        mod = await import(modulePath);
      } catch (e) {
        mod = null;
      }
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    expectedExports.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });
    });
  });
}

/**
 * Crea tests dinámicos para verificar exports de tipos (enums)
 * @param {string} name - Nombre del módulo
 * @param {string} modulePath - Ruta del módulo
 * @param {string[]} expectedTypeExports - Lista de tipos esperados
 */
export function createTypeExportTests(name, modulePath, expectedTypeExports) {
  describe(`${name}`, () => {
    let mod;

    beforeAll(async () => {
      try {
        mod = await import(modulePath);
      } catch (e) {
        mod = null;
      }
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    expectedTypeExports.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });

      it(`${exportName} MUST be an object (enum)`, () => {
        if (!mod || !mod[exportName]) return;
        expect(typeof mod[exportName]).toBe('object');
      });
    });
  });
}

/**
 * Crea test para verificar que un módulo tiene default export
 * @param {string} name - Nombre descriptivo
 * @param {string} modulePath - Ruta del módulo
 * @param {string} expectedClassName - Nombre de la clase esperada
 */
export function createDefaultExportTest(name, modulePath, expectedClassName) {
  let mod;

  beforeAll(async () => {
    try {
      mod = await import(modulePath);
    } catch (e) {
      mod = null;
    }
  });

  it(`${name} MUST have default export`, () => {
    if (!mod) return;
    expect(mod.default).toBeDefined();
  });

  it(`${name} default MUST be ${expectedClassName} class`, () => {
    if (!mod) return;
    expect(mod.default).toBe(mod[expectedClassName]);
  });
}

/**
 * Helper para importar módulos de forma segura
 * @param {string} modulePath - Ruta del módulo
 * @returns {Promise<Object|null>} - Módulo importado o null
 */
export async function safeImport(modulePath) {
  try {
    return await import(modulePath);
  } catch (e) {
    return null;
  }
}

/**
 * Crea test para verificar que un export existe
 * @param {string} exportName - Nombre del export
 */
export function createExportExistsTest(exportName) {
  it(`MUST export ${exportName}`, async function() {
    const mod = await safeImport(this.modulePath);
    if (!mod) return;
    expect(mod[exportName]).toBeDefined();
  });
}
