import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PtyFFIUnavailableError, PtyLibraryNotFoundError, PtyABIError } from './errors.js';
import type { DynamicLibrary } from 'node:ffi';

import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// PTY Native Functions
export type PtyAbiVersionFn = () => number;
export type PtySpawnFn = (file: string, args: string, cwd: string, env: string, cols: number, rows: number, pid_out: Buffer) => number;
export type PtyResizeFn = (fd: number, cols: number, rows: number) => number;
export type PtyWaitFn = (pid: number, out: Buffer) => number;
export type PtyKillFn = (pid: number, sig: number) => number;
export type PtyFgPgidFn = (fd: number) => number;

export interface NativePtyLib {
  pty_abi_version: PtyAbiVersionFn;
  pty_spawn: PtySpawnFn;
  pty_resize: PtyResizeFn;
  pty_wait: PtyWaitFn;
  pty_kill: PtyKillFn;
  pty_fg_pgid: PtyFgPgidFn;
}

let nativeLib: NativePtyLib | null = null;

function resolveLibPath(): string {
  if (process.env.PTY_FFI_LIB) {
    return process.env.PTY_FFI_LIB;
  }

  const arch = process.arch; // e.g. arm64
  let targetArch: string = arch;
  if (arch === 'arm64') {
    targetArch = 'aarch64';
  }

  const isAndroid = process.platform === 'android';
  if (!isAndroid) {
    console.warn(`[droid-pty] Warning: running on platform '${process.platform}', but droid-pty is meant for android (Termux). Things might fail.`);
  }

  // Prebuilt lookup
  const prebuiltPath = path.join(__dirname, '..', 'prebuilt', `android-${arch}`, 'libpty_helper.so');
  if (fs.existsSync(prebuiltPath)) {
    return prebuiltPath;
  }

  // Fallback to local dev path
  const devPath = path.join(__dirname, '..', 'native', 'target', targetArch, 'release', 'libpty_helper.so');
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  const devDebugPath = path.join(__dirname, '..', 'native', 'target', targetArch, 'debug', 'libpty_helper.so');
  if (fs.existsSync(devDebugPath)) {
    return devDebugPath;
  }

  // As a last resort, just try name, assuming it's in LD_LIBRARY_PATH
  return 'libpty_helper.so';
}

export function getNativeLib(): NativePtyLib {
  if (nativeLib) return nativeLib;

  let ffi: any;
  try {
    if ((process as any).getBuiltinModule) {
      ffi = (process as any).getBuiltinModule('node:ffi');
    } else {
      ffi = require('node:ffi');
    }
  } catch (e) {
    throw new PtyFFIUnavailableError();
  }

  if (!ffi || !ffi.DynamicLibrary) {
    throw new PtyFFIUnavailableError();
  }

  const libPath = resolveLibPath();
  if (libPath.includes(path.sep) && !fs.existsSync(libPath)) {
    throw new PtyLibraryNotFoundError(libPath);
  }

  let dl: DynamicLibrary;
  try {
    dl = new ffi.DynamicLibrary(libPath);
  } catch (e: any) {
    throw new PtyLibraryNotFoundError(libPath + ' (' + e.message + ')');
  }

  const pty_abi_version = dl.getFunction<PtyAbiVersionFn>('pty_abi_version', { return: 'int32', arguments: [] });
  
  const version = pty_abi_version();
  if (version !== 1) {
    throw new PtyABIError(1, version);
  }

  const pty_spawn = dl.getFunction<PtySpawnFn>('pty_spawn', {
    return: 'int32',
    arguments: ['string', 'string', 'string', 'string', 'int32', 'int32', 'buffer']
  });

  const pty_resize = dl.getFunction<PtyResizeFn>('pty_resize', {
    return: 'int32',
    arguments: ['int32', 'int32', 'int32']
  });

  const pty_wait = dl.getFunction<PtyWaitFn>('pty_wait', {
    return: 'int32',
    arguments: ['int32', 'buffer']
  });

  const pty_kill = dl.getFunction<PtyKillFn>('pty_kill', {
    return: 'int32',
    arguments: ['int32', 'int32']
  });

  const pty_fg_pgid = dl.getFunction<PtyFgPgidFn>('pty_fg_pgid', {
    return: 'int32',
    arguments: ['int32']
  });

  nativeLib = {
    pty_abi_version,
    pty_spawn,
    pty_resize,
    pty_wait,
    pty_kill,
    pty_fg_pgid,
  };

  return nativeLib;
}
