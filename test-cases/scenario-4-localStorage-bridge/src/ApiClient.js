/**
 * ApiClient.js
 * 
 * Simula un cliente de API que necesita el token de autenticación.
 * Lee el token directamente de localStorage.
 */

export async function fetchData(endpoint) {
    // SIDE EFFECT: Lectura de localStorage
    const token = localStorage.getItem('auth_token');

    if (!token) {
        throw new Error("No hay token de autenticación disponible");
    }

    console.log(`Haciendo petición a ${endpoint} con token: ${token.substring(0, 5)}...`);

    // Simulación de fetch
    // fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });

    return { data: "success" };
}
