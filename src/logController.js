const HostName = {
  dev: 'https://dev.openknowledge.hk',
  prod: 'https://www.rainbowone.app/'
};

const logController = {
  currentHostName: HostName.dev,

  log(...args) {
    if (this.currentHostName === HostName.dev) {
      console.log(...args); // Only log if current host is enabled
    }
  },
  warn(...args) {
    if (this.currentHostName === HostName.dev) {
      console.warn(...args); // Log warnings if enabled
    }
  },
  error(...args) {
    if (this.currentHostName === HostName.dev) {
      console.error(...args); // Log errors if enabled
    }
  }
}

export { logController };
