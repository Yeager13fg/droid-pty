export declare class PtyError extends Error {
    constructor(message: string);
}
export declare class PtyLibraryNotFoundError extends PtyError {
    constructor(path: string);
}
export declare class PtyFFIUnavailableError extends PtyError {
    constructor();
}
export declare class PtyABIError extends PtyError {
    constructor(expected: number, actual: number);
}
export declare class PtySpawnError extends PtyError {
    constructor(msg: string);
}
