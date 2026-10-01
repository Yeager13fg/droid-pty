export class PtyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PtyLibraryNotFoundError extends PtyError {
  constructor(path: string) {
    super(`Native library not found at: ${path}`);
  }
}

export class PtyFFIUnavailableError extends PtyError {
  constructor() {
    super('The "node:ffi" module is unavailable. You may need to use Node.js >= 26.10 or run with --experimental-ffi.');
  }
}

export class PtyABIError extends PtyError {
  constructor(expected: number, actual: number) {
    super(`Incompatible ABI version. Expected ${expected}, got ${actual}.`);
  }
}

export class PtySpawnError extends PtyError {
  constructor(msg: string) {
    super(`Failed to spawn PTY: ${msg}`);
  }
}
