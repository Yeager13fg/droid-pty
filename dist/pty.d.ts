import type { IPty, IDisposable } from './types.js';
export declare class Pty implements IPty {
    private _pid;
    private _fd;
    private _cols;
    private _rows;
    private _readStream;
    private _lib;
    private _dataListeners;
    private _exitListeners;
    private _decoder;
    private _intervalId;
    private _exited;
    private _waitBuf;
    constructor(pid: number, fd: number, cols: number, rows: number);
    get pid(): number;
    get cols(): number;
    get rows(): number;
    get process(): string;
    private _setupReadStream;
    private _startPolling;
    private _checkExit;
    onData(event: (data: string) => void): IDisposable;
    onExit(event: (e: {
        exitCode: number;
        signal?: number;
    }) => void): IDisposable;
    write(data: string | Uint8Array): void;
    resize(columns: number, rows: number): void;
    clear(): void;
    kill(signal?: string | number): void;
    pause(): void;
    resume(): void;
}
