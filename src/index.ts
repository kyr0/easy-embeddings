import { env, pipeline, type AllTasks } from "@xenova/transformers.js";
import {
  embed as crossLlmEmbed,
  type Embedding,
  type EmbeddingApiOptions,
  type EmbeddingParams,
  type EmbeddingResponse,
} from "cross-llm";
import type {
  ModelCache,
  Options,
  ImportWasmModuleFn,
  Provider,
  Params,
} from "./types";

const modelCache: ModelCache = {};

// https://huggingface.co/Xenova/multilingual-e5-small
const loadEmbeddingModel = async (
  modelName: string,
  options: Partial<Options> = {},
  internalWasmLoader?: ImportWasmModuleFn,
): Promise<AllTasks["feature-extraction"]> => {
  if (modelCache[modelName]) {
    return modelCache[modelName];
  }

  if (typeof options.importWasmModule === "function") {
    env.backends.onnx.importWasmModule = options.importWasmModule;
  } else if (internalWasmLoader) {
    env.backends.onnx.importWasmModule = internalWasmLoader;
  }

  if (!options.modelOptions) {
    options.modelOptions = {};
  }

  env.localModelPath = options.modelOptions.localModelPath || "models/";
  env.allowRemoteModels = options.modelOptions.allowRemoteModels || true;
  env.allowLocalModels = options.modelOptions.allowLocalModels || true;

  if (env.backends.onnx) {
    env.backends.onnx.wasm.wasmPaths =
      options.modelOptions.onnxWasmPaths || "/";
    env.backends.onnx.wasm.proxy =
      typeof options.modelOptions.onnxProxy !== "undefined"
        ? options.modelOptions.onnxProxy
        : false;
  }

  // store original reference
  const originalConsole = (globalThis || self).console;

  if (options.modelOptions.hideOnnxWarnings) {
    // override function reference with a new arrow function that does nothing
    (globalThis || self).console.error = () => {};
  }
  modelCache[modelName] = await pipeline("feature-extraction", modelName);

  if (options.modelOptions.hideOnnxWarnings) {
    // restore the original function reference, so that console.error() works just as before
    (globalThis || self).console.error = originalConsole.error;
  }
  return modelCache[modelName];
};

export const _embed =
  (wasmLoader?: ImportWasmModuleFn) =>
  async (
    input: string | Array<string>,
    providerType: Provider,
    params: Params,
    options?: Options,
  ): Promise<EmbeddingResponse> => {
    if (providerType === "local") {
      const time = performance.now();
      if (!params.model) {
        params.model = "Xenova/multilingual-e5-small";
      }

      const extractor = await loadEmbeddingModel(
        params.model,
        options,
        wasmLoader,
      );

      if (!Array.isArray(input)) {
        input = [input];
      }

      const results: Array<Embedding> = [];
      for (let i = 0; i < input.length; i++) {
        const embedding = await extractor(input[i], {
          pooling: "mean",
          normalize: true,
          quantize: true,
          ...params.modelParams,
        });

        results.push({
          embedding: Array.from(embedding.data),
          index: i,
          object: "embedding",
        });
      }

      return {
        price: {
          input: 0,
          output: 0,
          total: 0,
        },
        data: results,
        elapsedMs: performance.now() - time,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      };
    }
    return crossLlmEmbed(
      input,
      providerType,
      params as EmbeddingParams,
      options as EmbeddingApiOptions,
    );
  };
