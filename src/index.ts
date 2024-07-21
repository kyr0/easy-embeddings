import {
  env,
  pipeline,
  type FeatureExtractionPipelineOptions,
  type AllTasks,
} from "@xenova/transformers.js";

import {
  embed as crossLlmEmbed,
  type Embedding,
  type EmbeddingApiOptions,
  type EmbeddingParams,
  type EmbeddingProvider,
  type EmbeddingResponse,
} from "cross-llm";

export type ImportWasmModuleFn = (
  mjsPathOverride: string,
  wasmPrefixOverride: string,
  numThreads: boolean,
) => Promise<[string | undefined, any]>;

export type Provider = EmbeddingProvider | "local";

export type LocalModelOptions = {
  hideOnnxWarnings?: boolean;
  allowRemoteModels?: boolean;
  allowLocalModels?: boolean;
  localModelPath?: string;
  onnxWasmPaths?: string;
  onnxProxy?: boolean;
};

export interface Params extends Omit<EmbeddingParams, "model"> {
  model?: EmbeddingParams["model"] | string;
  modelParams?: Partial<FeatureExtractionPipelineOptions>;
}

export interface Options extends EmbeddingApiOptions {
  importWasmModule?: ImportWasmModuleFn;
  modelOptions: LocalModelOptions;
}

export interface ModelCache {
  [modelName: string]: AllTasks["feature-extraction"];
}

// @ts-ignore
import getModule from "../public/ort-wasm-simd-threaded.jsep";

export const wasmLoader = async (
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

const modelCache: ModelCache = {};

// https://huggingface.co/Xenova/multilingual-e5-small
export const loadEmbeddingModel = async (
  modelName: string,
  options: Partial<Options> = {},
): Promise<AllTasks["feature-extraction"]> => {
  if (modelCache[modelName]) {
    return modelCache[modelName];
  }

  if (typeof options.importWasmModule === "function") {
    env.backends.onnx.importWasmModule = options.importWasmModule;
  } else {
    env.backends.onnx.importWasmModule = wasmLoader;
  }

  if (!options.modelOptions) {
    options.modelOptions = {};
  }

  env.localModelPath = options.modelOptions.localModelPath || "models/";
  env.allowRemoteModels = options.modelOptions.allowRemoteModels || true;
  env.allowLocalModels = options.modelOptions.allowLocalModels || true;
  env.backends.onnx.wasm.wasmPaths = options.modelOptions.onnxWasmPaths || "/";
  env.backends.onnx.wasm.proxy =
    typeof options.modelOptions.onnxProxy !== "undefined"
      ? options.modelOptions.onnxProxy
      : false;

  // store original reference
  const originalConsole = self.console;

  if (options.modelOptions.hideOnnxWarnings) {
    // override function reference with a new arrow function that does nothing
    self.console.error = () => {};
  }
  modelCache[modelName] = await pipeline("feature-extraction", modelName);

  if (options.modelOptions.hideOnnxWarnings) {
    // restore the original function reference, so that console.error() works just as before
    self.console.error = originalConsole.error;
  }
  return modelCache[modelName];
};

export const embed = async (
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

    const extractor = await loadEmbeddingModel(params.model, options);

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
