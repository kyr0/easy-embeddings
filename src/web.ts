import type { EmbeddingResponse } from "cross-llm";
import { wasmLoaderHoc } from "./loader";
import { _embed } from ".";
import type { Options, Params, Provider } from "./types";

// @ts-ignore
import getModule from "./.ort/ort-wasm-simd-threaded.jsep-web.mjs";

export const embed = async (
  input: string | Array<string>,
  providerType: Provider,
  params: Params,
  options?: Options,
): Promise<EmbeddingResponse> =>
  _embed(wasmLoaderHoc(getModule))(input, providerType, params, options);
