declare module 'node:ffi' {
  export type FFIType = 'string' | 'buffer' | 'int32' | 'uint32' | 'int64' | 'uint64' | 'double' | 'void';

  export interface DynamicLibraryFunctionOptions {
    return: FFIType;
    arguments: FFIType[];
  }

  export class DynamicLibrary {
    constructor(path: string);
    getFunction<T extends Function>(name: string, options: DynamicLibraryFunctionOptions): T;
  }
}
