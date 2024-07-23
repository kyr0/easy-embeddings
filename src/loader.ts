import type { ImportWasmModuleFn } from "./types";

export const wasmLoaderHoc =
  (getModule: Function): ImportWasmModuleFn =>
  async (
    _mjsPathOverride: string,
    _wasmPrefixOverride: string,
    _threading: boolean,
  ) => {
    return [
      undefined,
      async (moduleArgs = {}) => {
        return await getModule(moduleArgs);
      },
    ];
  };
