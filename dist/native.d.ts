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
export declare function getNativeLib(): NativePtyLib;
