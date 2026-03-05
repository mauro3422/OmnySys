import { walk, text, AtomBuilder } from './utils.js';

/**
 * Extrae clases convirtiéndolas en Átomos completos.
 */
export function extractClasses(root, code, filePath, exportedNames) {
    const builder = new AtomBuilder(filePath);
    const classAtoms = [];

    walk(root, ['class_declaration', 'class'], (node) => {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
            const className = text(nameNode, code);
            const isExported = exportedNames.has(className);

            const atom = builder.createAtom(className, 'class', node, {
                isExported,
                className
            });

            classAtoms.push(atom);
        }
    });

    return classAtoms;
}
