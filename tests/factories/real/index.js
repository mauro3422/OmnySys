/**
 * @fileoverview index.js
 * 
 * Real Factories - Reemplazo de mocks con implementaciones reales
 * 
 * @module tests/factories/real
 */

export { FileSystemFactory, createSandbox, withSandbox } from './filesystem.factory.js';
export { ProjectFactory, PROJECT_TEMPLATES, createTestProject, withProject } from './project.factory.js';

/**
 * Guia de uso:
 * 
 * 1. FileSystemFactory - Crea archivos reales en directorio temporal
 *    const fs = await FileSystemFactory.create();
 *    await fs.createFile('test.js', 'const x = 1;');
 *    await fs.cleanup();
 * 
 * 2. ProjectFactory - Crea proyectos completos
 *    const project = await createTestProject('simple');
 *    // project.path contiene el path real
 *    await project.cleanup();
 * 
 * 3. withSandbox/withProject - Auto-cleanup
 *    await withProject('complex', async (project) => {
 *      // usar project
 *      // cleanup automatico al finalizar
 *    });
 */
