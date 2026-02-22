/**
 * @fileoverview Event Builder - Builder for creating event-related test code
 */

export class EventBuilder {
  constructor() {
    this.code = '';
    this.events = { listeners: [], emitters: [], all: [] };
  }

  /**
   * Add addEventListener
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   * @param {string} target - Event target (document, window, element)
   */
  withEventListener(event = 'click', handler = 'handleClick', target = 'document') {
    this.code += `
${target}.addEventListener('${event}', ${handler});
`;
    const line = this.code.split('\n').length - 1;
    this.events.listeners.push({ event, line, type: 'listener' });
    this.events.all.push({ event, line, type: 'listener' });
    return this;
  }

  /**
   * Add removeEventListener
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   */
  withRemoveEventListener(event = 'click', handler = 'handleClick') {
    this.code += `
document.removeEventListener('${event}', ${handler});
`;
    return this;
  }

  /**
   * Add CustomEvent dispatch
   * @param {string} event - Event name
   * @param {string} detail - Event detail
   */
  withCustomEvent(event = 'custom-event', detail = '{}') {
    this.code += `
document.dispatchEvent(new CustomEvent('${event}', { detail: ${detail} }));
`;
    const line = this.code.split('\n').length - 1;
    this.events.emitters.push({ event, line, type: 'emitter' });
    this.events.all.push({ event, line, type: 'emitter' });
    return this;
  }

  /**
   * Add Event (not CustomEvent) dispatch
   * @param {string} event - Event name
   */
  withEventDispatch(event = 'load') {
    this.code += `
window.dispatchEvent(new Event('${event}'));
`;
    const line = this.code.split('\n').length - 1;
    this.events.emitters.push({ event, line, type: 'emitter' });
    this.events.all.push({ event, line, type: 'emitter' });
    return this;
  }

  /**
   * Add .on() method (EventEmitter style)
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   */
  withOnMethod(event = 'data', handler = 'handleData') {
    this.code += `
emitter.on('${event}', ${handler});
`;
    const line = this.code.split('\n').length - 1;
    this.events.listeners.push({ event, line, type: 'listener' });
    this.events.all.push({ event, line, type: 'listener' });
    return this;
  }

  /**
   * Add .emit() method (EventEmitter style)
   * @param {string} event - Event name
   * @param {string} data - Event data
   */
  withEmitMethod(event = 'update', data = 'payload') {
    this.code += `
emitter.emit('${event}', ${data});
`;
    const line = this.code.split('\n').length - 1;
    this.events.emitters.push({ event, line, type: 'emitter' });
    this.events.all.push({ event, line, type: 'emitter' });
    return this;
  }

  /**
   * Add .once() method
   * @param {string} event - Event name
   * @param {string} handler - Handler function name
   */
  withOnceMethod(event = 'ready', handler = 'init') {
    this.code += `
emitter.once('${event}', ${handler});
`;
    const line = this.code.split('\n').length - 1;
    this.events.listeners.push({ event, line, type: 'listener' });
    this.events.all.push({ event, line, type: 'listener' });
    return this;
  }

  /**
   * Add multiple event listeners
   * @param {string[]} events - Event names
   */
  withMultipleListeners(events = ['click', 'submit', 'keydown']) {
    events.forEach((event, i) => {
      this.withEventListener(event, `handler${i}`);
    });
    return this;
  }

  /**
   * Create complete event bus
   */
  withEventBus() {
    return this
      .withOnMethod('user:login', 'onUserLogin')
      .withOnMethod('user:logout', 'onUserLogout')
      .withEmitMethod('user:login', '{ id: 1 }')
      .withEmitMethod('user:logout');
  }

  /**
   * Create DOM event handlers
   */
  withDOMEvents() {
    return this
      .withEventListener('click', 'handleClick')
      .withEventListener('submit', 'handleSubmit', 'form')
      .withEventListener('keydown', 'handleKeydown', 'window')
      .withCustomEvent('app:ready', '{ status: "ok" }');
  }

  build() {
    return {
      code: this.code,
      events: this.events
    };
  }
}
