/**
 * Builder para configuraciÃ³n de timeouts
 */
export class TimeoutConfigBuilder {
  constructor() {
    this.config = {
      code: '',
      baseTimeout: 20000,
      sizeFactor: 500,
      maxTimeout: 120000
    };
  }

  withCodeLength(length) {
    this.config.code = 'x'.repeat(length);
    return this;
  }

  withBaseTimeout(timeout) {
    this.config.baseTimeout = timeout;
    return this;
  }

  withSizeFactor(factor) {
    this.config.sizeFactor = factor;
    return this;
  }

  withMaxTimeout(timeout) {
    this.config.maxTimeout = timeout;
    return this;
  }

  asSmallFile() {
    this.config.code = 'x'.repeat(500);
    return this;
  }

  asMediumFile() {
    this.config.code = 'x'.repeat(2500);
    return this;
  }

  asLargeFile() {
    this.config.code = 'x'.repeat(10000);
    return this;
  }

  asHugeFile() {
    this.config.code = 'x'.repeat(200000);
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new TimeoutConfigBuilder();
  }
}
