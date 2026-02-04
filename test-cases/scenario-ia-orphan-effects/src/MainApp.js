/**
 * MainApp.js
 * 
 * App principal - importa Analytics moderno
 */

import { trackEvent } from './Analytics.js';

export class MainApp {
  constructor() {
    this.name = 'MainApp';
    trackEvent('app_init');
  }
  
  start() {
    console.log('App started');
    trackEvent('app_start');
  }
}

const app = new MainApp();
app.start();
