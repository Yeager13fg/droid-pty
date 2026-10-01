export interface IDisposable {
    dispose(): void;
}
export interface IPty {
    /**
     * The process ID of the child process.
     */
    readonly pid: number;
    /**
     * The column size in characters.
     */
    readonly cols: number;
    /**
     * The row size in characters.
     */
    readonly rows: number;
    /**
     * The title of the active process.
     */
    readonly process: string;
    /**
     * Adds a listener to the data event, fired when data is returned from the pty.
     * @param event The callback function.
     * @returns An IDisposable to remove the listener.
     */
    onData(event: (data: string) => void): IDisposable;
    /**
     * Adds a listener to the exit event, fired when the pty exits.
     * @param event The callback function.
     * @returns An IDisposable to remove the listener.
     */
    onExit(event: (e: {
        exitCode: number;
        signal?: number;
    }) => void): IDisposable;
    /**
     * Writes data to the socket.
     * @param data The data to write.
     */
    write(data: string | Uint8Array): void;
    /**
     * Resizes the dimensions of the pty.
     * @param columns The number of columns.
     * @param rows The number of rows.
     */
    resize(columns: number, rows: number): void;
    /**
     * Clears the pty's internal buffer.
     */
    clear(): void;
    /**
     * Kills the pty.
     * @param signal The signal to use, defaults to SIGTERM.
     */
    kill(signal?: string | number): void;
    /**
     * Pauses the pty for reading.
     */
    pause(): void;
    /**
     * Resumes the pty for reading.
     */
    resume(): void;
}
export interface SpawnOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: {
        [key: string]: string | undefined;
    };
    encoding?: string | null;
    handleFlowControl?: boolean;
    flowControlPause?: string;
    flowControlResume?: string;
}
