import * as tty from 'node:tty';
import * as fs from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { getNativeLib } from './native.js';
import type { IPty, IDisposable } from './types.js';
import type { NativePtyLib } from './native.js';

export class Pty implements IPty {
  private _pid: number;
  private _fd: number;
  private _cols: number;
  private _rows: number;
  private _readStream: tty.ReadStream | null = null;
  private _lib: NativePtyLib;
  private _dataListeners: Array<(data: string) => void> = [];
  private _exitListeners: Array<(e: { exitCode: number; signal?: number }) => void> = [];
  private _decoder: StringDecoder;
  private _intervalId: NodeJS.Timeout | null = null;
  private _exited = false;
  private _waitBuf: Buffer;

  constructor(pid: number, fd: number, cols: number, rows: number) {
    this._pid = pid;
    this._fd = fd;
    this._cols = cols;
    this._rows = rows;
    this._lib = getNativeLib();
    this._decoder = new StringDecoder('utf8');
    this._waitBuf = Buffer.alloc(8); // 2 * int32

    this._setupReadStream();
    this._startPolling();
  }

  get pid(): number {
    return this._pid;
  }

  get cols(): number {
    return this._cols;
  }

  get rows(): number {
    return this._rows;
  }

  get process(): string {
    const pgid = this._lib.pty_fg_pgid(this._fd);
    if (pgid > 0) {
      try {
        const comm = fs.readFileSync(`/proc/${pgid}/comm`, 'utf8');
        return comm.trim();
      } catch (e) {
        // Fallback
      }
    }
    return '';
  }

  private _setupReadStream() {
    this._readStream = new tty.ReadStream(this._fd);
    this._readStream.on('data', (chunk: Buffer) => {
      const data = this._decoder.write(chunk);
      if (data) {
        for (const listener of this._dataListeners) {
          listener(data);
        }
      }
    });

    this._readStream.on('error', (err: any) => {
      if (err.code === 'EIO') {
        // EIO means slave closed, it's normal.
        this._readStream?.destroy();
      } else {
        throw err;
      }
    });
  }

  private _startPolling() {
    this._intervalId = setInterval(() => {
      this._checkExit();
    }, 50);
  }

  private _checkExit() {
    if (this._exited) return;

    const res = this._lib.pty_wait(this._pid, this._waitBuf);
    if (res === 1) {
      // Exited
      this._exited = true;
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }

      const exitCode = this._waitBuf.readInt32LE(0);
      const signal = this._waitBuf.readInt32LE(4);

      // Wait a bit for stream to flush
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

  onData(event: (data: string) => void): IDisposable {
    this._dataListeners.push(event);
    return {
      dispose: () => {
        this._dataListeners = this._dataListeners.filter((l) => l !== event);
      },
    };
  }

  onExit(event: (e: { exitCode: number; signal?: number }) => void): IDisposable {
    this._exitListeners.push(event);
    return {
      dispose: () => {
        this._exitListeners = this._exitListeners.filter((l) => l !== event);
      },
    };
  }

  write(data: string | Uint8Array): void {
    if (this._exited) return;
    
    let buf: Buffer;
    if (typeof data === 'string') {
      buf = Buffer.from(data, 'utf8');
    } else {
      buf = Buffer.from(data);
    }

    try {
      let written = 0;
      while (written < buf.length) {
        written += fs.writeSync(this._fd, buf, written, buf.length - written);
      }
    } catch (e: any) {
      if (e.code === 'EAGAIN') {
        // Simple retry could block, but typically PTY writing is fast.
        // A full implementation would use a queue.
        fs.writeSync(this._fd, buf);
      } else if (e.code !== 'EIO') {
        throw e;
      }
    }
  }

  resize(columns: number, rows: number): void {
    if (this._exited) return;
    if (columns <= 0 || rows <= 0) return;
    this._cols = columns;
    this._rows = rows;
    this._lib.pty_resize(this._fd, columns, rows);
  }

  clear(): void {
    // Basic support
    this.write('\x1bc');
  }

  kill(signal?: string | number): void {
    if (this._exited) return;
    let sigNum = 15; // SIGTERM
    if (typeof signal === 'number') {
      sigNum = signal;
    } else if (typeof signal === 'string') {
      // Very basic signal mapping
      const signals: Record<string, number> = {
        SIGINT: 2,
        SIGQUIT: 3,
        SIGKILL: 9,
        SIGTERM: 15,
      };
      sigNum = signals[signal] || 15;
    }
    this._lib.pty_kill(this._pid, sigNum);
  }

  pause(): void {
    this._readStream?.pause();
  }

  resume(): void {
    this._readStream?.resume();
  }
}
