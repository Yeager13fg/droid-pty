import { Pty } from './pty.js';
import { getNativeLib } from './native.js';
import { PtySpawnError } from './errors.js';
import type { SpawnOptions, IPty } from './types.js';

export function spawn(file: string, args: string[] | string = [], options: SpawnOptions = {}): IPty {
  const lib = getNativeLib();

  const cols = options.cols || 80;
  const rows = options.rows || 24;
  const cwd = options.cwd || process.cwd();
  
  let envObj = options.env || process.env;
  
  // Clone env to inject basic variables if missing
  const envMap: Record<string, string> = {};
  for (const key of Object.keys(envObj)) {
    if (envObj[key] !== undefined) {
      envMap[key] = envObj[key] as string;
    }
  }

  if (!envMap.TERM) {
    envMap.TERM = 'xterm-256color';
  }
  if (!envMap.COLORTERM) {
    envMap.COLORTERM = 'truecolor';
  }

  const envStr = Object.entries(envMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  let argsArr: string[];
  if (typeof args === 'string') {
    argsArr = [args];
  } else {
    argsArr = args;
  }
  const argsStr = argsArr.join('\n');

  const pidOut = Buffer.alloc(4); // int32

  const fd = lib.pty_spawn(file, argsStr, cwd, envStr, cols, rows, pidOut);

  if (fd < 0) {
    throw new PtySpawnError(`Failed to spawn ${file}`);
  }

  const pid = pidOut.readInt32LE(0);

  return new Pty(pid, fd, cols, rows);
}
