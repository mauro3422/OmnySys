/**
 * WebGLRenderer.js
 */

import { fragmentShaderSource } from './FragmentShader.js';

export function setupShaders(gl, program) {
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resLocation = gl.getUniformLocation(program, "u_resolution");

    // Estos nombres de uniforms deben coincidir con lo que hay en FragmentShader.js
    gl.uniform1f(timeLocation, performance.now() / 1000.0);
    gl.uniform2f(resLocation, window.innerWidth, window.innerHeight);

    console.log("Uniforms configurados correctamente");
}
