
/**
 * Test file for Integrity Guard
 */
export function asyncFunctionSyncExecution() {
    console.log("No soy realmente async pero mi nombre dice que sí");
}

export function unusedInputsLogic(a, b, c) {
    return a + b; // 'c' no se usa
}
