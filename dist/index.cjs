"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  PtyABIError: () => PtyABIError,
  PtyError: () => PtyError,
  PtyFFIUnavailableError: () => PtyFFIUnavailableError,
  PtyLibraryNotFoundError: () => PtyLibraryNotFoundError,
  PtySpawnError: () => PtySpawnError,
  spawn: () => spawn
});
module.exports = __toCommonJS(index_exports);

// src/pty.ts
var tty = __toESM(require("node:tty"), 1);
var fs2 = __toESM(require("node:fs"), 1);
var import_node_string_decoder = require("node:string_decoder");

// src/native.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_url = require("node:url");

// src/errors.ts
var PtyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
};
var PtyLibraryNotFoundError = class extends PtyError {
  constructor(path2) {
    super(`Native library not found at: ${path2}`);
  }
};
var PtyFFIUnavailableError = class extends PtyError {
  constructor() {
    super('The "node:ffi" module is unavailable. You may need to use Node.js >= 26.10 or run with --experimental-ffi.');
  }
};
var PtyABIError = class extends PtyError {
  constructor(expected, actual) {
    super(`Incompatible ABI version. Expected ${expected}, got ${actual}.`);
  }
};
var PtySpawnError = class extends PtyError {
  constructor(msg) {
    super(`Failed to spawn PTY: ${msg}`);
  }
};

// src/native.ts
var import_node_module = require("node:module");
var import_meta = {};
var __filename = (0, import_node_url.fileURLToPath)(import_meta.url);
var __dirname = import_node_path.default.dirname(__filename);
var require2 = (0, import_node_module.createRequire)(import_meta.url);
var nativeLib = null;
function resolveLibPath() {
  if (process.env.PTY_FFI_LIB) {
    return process.env.PTY_FFI_LIB;
  }
  const arch = process.arch;
  let targetArch = arch;
  if (arch === "arm64") {
    targetArch = "aarch64";
  }
  const isAndroid = process.platform === "android";
  if (!isAndroid) {
    console.warn(`[droid-pty] Warning: running on platform '${process.platform}', but droid-pty is meant for android (Termux). Things might fail.`);
  }
  const prebuiltPath = import_node_path.default.join(__dirname, "..", "prebuilt", `android-${arch}`, "libpty_helper.so");
  if (import_node_fs.default.existsSync(prebuiltPath)) {
    return prebuiltPath;
  }
  const devPath = import_node_path.default.join(__dirname, "..", "native", "target", targetArch, "release", "libpty_helper.so");
  if (import_node_fs.default.existsSync(devPath)) {
    return devPath;
  }
  const devDebugPath = import_node_path.default.join(__dirname, "..", "native", "target", targetArch, "debug", "libpty_helper.so");
  if (import_node_fs.default.existsSync(devDebugPath)) {
    return devDebugPath;
  }
  return "libpty_helper.so";
}
function getNativeLib() {
  if (nativeLib) return nativeLib;
  let ffi;
  try {
    if (process.getBuiltinModule) {
      ffi = process.getBuiltinModule("node:ffi");
    } else {
      ffi = require2("node:ffi");
    }
  } catch (e) {
    throw new PtyFFIUnavailableError();
  }
  if (!ffi || !ffi.DynamicLibrary) {
    throw new PtyFFIUnavailableError();
  }
  const libPath = resolveLibPath();
  if (libPath.includes(import_node_path.default.sep) && !import_node_fs.default.existsSync(libPath)) {
    throw new PtyLibraryNotFoundError(libPath);
  }
  let dl;
  try {
    dl = new ffi.DynamicLibrary(libPath);
  } catch (e) {
    throw new PtyLibraryNotFoundError(libPath + " (" + e.message + ")");
  }
  const pty_abi_version = dl.getFunction("pty_abi_version", { returns: "int32", args: [] });
  const version = pty_abi_version();
  if (version !== 1) {
    throw new PtyABIError(1, version);
  }
  const pty_spawn = dl.getFunction("pty_spawn", {
    returns: "int32",
    args: ["string", "string", "string", "string", "int32", "int32", "buffer"]
  });
  const pty_resize = dl.getFunction("pty_resize", {
    returns: "int32",
    args: ["int32", "int32", "int32"]
  });
  const pty_wait = dl.getFunction("pty_wait", {
    returns: "int32",
    args: ["int32", "buffer"]
  });
  const pty_kill = dl.getFunction("pty_kill", {
    returns: "int32",
    args: ["int32", "int32"]
  });
  const pty_fg_pgid = dl.getFunction("pty_fg_pgid", {
    returns: "int32",
    args: ["int32"]
  });
  nativeLib = {
    pty_abi_version,
    pty_spawn,
    pty_resize,
    pty_wait,
    pty_kill,
    pty_fg_pgid
  };
  return nativeLib;
}

// src/pty.ts
var Pty = class {
  _pid;
  _fd;
  _cols;
  _rows;
  _readStream = null;
  _lib;
  _dataListeners = [];
  _exitListeners = [];
  _decoder;
  _intervalId = null;
  _exited = false;
  _waitBuf;
  constructor(pid, fd, cols, rows) {
    this._pid = pid;
    this._fd = fd;
    this._cols = cols;
    this._rows = rows;
    this._lib = getNativeLib();
    this._decoder = new import_node_string_decoder.StringDecoder("utf8");
    this._waitBuf = Buffer.alloc(8);
    this._setupReadStream();
    this._startPolling();
  }
  get pid() {
    return this._pid;
  }
  get cols() {
    return this._cols;
  }
  get rows() {
    return this._rows;
  }
  get process() {
    const pgid = this._lib.pty_fg_pgid(this._fd);
    if (pgid > 0) {
      try {
        const comm = fs2.readFileSync(`/proc/${pgid}/comm`, "utf8");
        return comm.trim();
      } catch (e) {
      }
    }
    return "";
  }
  _setupReadStream() {
    this._readStream = new tty.ReadStream(this._fd);
    this._readStream.on("data", (chunk) => {
      const data = this._decoder.write(chunk);
      if (data) {
        for (const listener of this._dataListeners) {
          listener(data);
        }
      }
    });
    this._readStream.on("error", (err) => {
      if (err.code === "EIO") {
        this._readStream?.destroy();
      } else {
        throw err;
      }
    });
  }
  _startPolling() {
    this._intervalId = setInterval(() => {
      this._checkExit();
    }, 50);
  }
  _checkExit() {
    if (this._exited) return;
    const res = this._lib.pty_wait(this._pid, this._waitBuf);
    if (res === 1) {
      this._exited = true;
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      const exitCode = this._waitBuf.readInt32LE(0);
      const signal = this._waitBuf.readInt32LE(4);
      setTimeout(() => {
        const remaining = this._decoder.end();
        if (remaining) {
          for (const listener of this._dataListeners) {
            listener(remaining);
          }
        }
        this._readStream?.destroy();
        for (const listener of this._exitListeners) {
          listener({ exitCode, signal });
        }
      }, 20);
    }
  }
  onData(event) {
    this._dataListeners.push(event);
    return {
      dispose: () => {
        this._dataListeners = this._dataListeners.filter((l) => l !== event);
      }
    };
  }
  onExit(event) {
    this._exitListeners.push(event);
    return {
      dispose: () => {
        this._exitListeners = this._exitListeners.filter((l) => l !== event);
      }
    };
  }
  write(data) {
    if (this._exited) return;
    let buf;
    if (typeof data === "string") {
      buf = Buffer.from(data, "utf8");
    } else {
      buf = Buffer.from(data);
    }
    try {
      let written = 0;
      while (written < buf.length) {
        written += fs2.writeSync(this._fd, buf, written, buf.length - written);
      }
    } catch (e) {
      if (e.code === "EAGAIN") {
        fs2.writeSync(this._fd, buf);
      } else if (e.code !== "EIO") {
        throw e;
      }
    }
  }
  resize(columns, rows) {
    if (this._exited) return;
    if (columns <= 0 || rows <= 0) return;
    this._cols = columns;
    this._rows = rows;
    this._lib.pty_resize(this._fd, columns, rows);
  }
  clear() {
    this.write("\x1Bc");
  }
  kill(signal) {
    if (this._exited) return;
    let sigNum = 15;
    if (typeof signal === "number") {
      sigNum = signal;
    } else if (typeof signal === "string") {
      const signals = {
        SIGINT: 2,
        SIGQUIT: 3,
        SIGKILL: 9,
        SIGTERM: 15
      };
      sigNum = signals[signal] || 15;
    }
    this._lib.pty_kill(this._pid, sigNum);
  }
  pause() {
    this._readStream?.pause();
  }
  resume() {
    this._readStream?.resume();
  }
};

// src/spawn.ts
function spawn(file, args = [], options = {}) {
  const lib = getNativeLib();
  const cols = options.cols || 80;
  const rows = options.rows || 24;
  const cwd = options.cwd || process.cwd();
  let envObj = options.env || process.env;
  const envMap = {};
  for (const key of Object.keys(envObj)) {
    if (envObj[key] !== void 0) {
      envMap[key] = envObj[key];
    }
  }
  if (!envMap.TERM) {
    envMap.TERM = "xterm-256color";
  }
  if (!envMap.COLORTERM) {
    envMap.COLORTERM = "truecolor";
  }
  const envStr = Object.entries(envMap).map(([k, v]) => `${k}=${v}`).join("\n");
  let argsArr;
  if (typeof args === "string") {
    argsArr = [args];
  } else {
    argsArr = args;
  }
  const argsStr = argsArr.join("\n");
  const pidOut = Buffer.alloc(4);
  const fd = lib.pty_spawn(file, argsStr, cwd, envStr, cols, rows, pidOut);
  if (fd < 0) {
    throw new PtySpawnError(`Failed to spawn ${file}`);
  }
  const pid = pidOut.readInt32LE(0);
  return new Pty(pid, fd, cols, rows);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PtyABIError,
  PtyError,
  PtyFFIUnavailableError,
  PtyLibraryNotFoundError,
  PtySpawnError,
  spawn
});
//# sourceMappingURL=index.cjs.map
