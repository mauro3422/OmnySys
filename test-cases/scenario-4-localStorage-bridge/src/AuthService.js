/**
 * AuthService.js
 * 
 * Simula el manejo de autenticación.
 * Guarda el token en localStorage.
 */

export function login(username, password) {
    console.log(`Intentando login para: ${username}`);

    // Simulación de éxito
    const fakeToken = "jwt_token_12345";

    // SIDE EFFECT: Escritura en localStorage
    localStorage.setItem('auth_token', fakeToken);

    console.log("Token guardado en localStorage");
}

export function logout() {
    localStorage.removeItem('auth_token');
}
