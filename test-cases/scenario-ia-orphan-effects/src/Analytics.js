/**
 * Analytics.js
 * 
 * Analytics moderno - importado por MainApp
 */

export function trackEvent(eventName, data = {}) {
  console.log(`[Analytics] Event: ${eventName}`, data);
  // Enviar a servidor de analytics
}

export function trackPageView(page) {
  trackEvent('page_view', { page });
}
