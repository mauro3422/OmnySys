/**
 * Core.js
 * 
 * Este es un objeto central que todo el mundo usa.
 */

export function criticalFunction() {
    return "critical data";
}

export function globalConfig() {
    return { version: "1.0.0", theme: "dark" };
}

export function logger(msg) {
    console.log(`[CORE] ${msg}`);
}
