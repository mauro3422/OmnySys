/**
 * @deprecated Esta función es ultra vieja, por favor usar la nueva API v2
 */
export function oldCalculationSystem() {
    return 42;
}

/**
 * Función que delega ciegamente a otro sitio
 */
export function simpleDelegate(a, b) {
    return complexLogicEngine(a, b);
}

function complexLogicEngine(a, b) {
    return a + b;
}
