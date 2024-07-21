import {
  env,
  AutoModel,
  AutoTokenizer,
  type PreTrainedTokenizer,
  type PreTrainedModel,
} from "@xenova/transformers.js";
import {
  embed as crossLlmEmbed,
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
  [key: string]: any;
  hideOnnxWarnings?: boolean;
  allowRemoteModels?: boolean;
  allowLocalModels?: boolean;
  localModelPath?: string;
  onnxWasmPaths?: string;
  onnxProxy?: boolean;
  device: "cpu" | "gpu" | "webgpu" | "wasm";
  dtype: "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "bnb4" | "q4f16";
};

export interface Params extends Omit<EmbeddingParams, "model"> {
  model?: EmbeddingParams["model"] | string;

  tokenizerOptions: {
    [key: string]: any;
  };
  modelOptions: LocalModelOptions;
}

export interface Options extends EmbeddingApiOptions {
  importWasmModule?: ImportWasmModuleFn;
}

export interface ModelCache {
  [modelName: string]: {
    tokenizer: PreTrainedTokenizer;
    model: PreTrainedModel;
  };
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

// https://huggingface.co/Xenova/multilingual-e5-small
export const loadEmbeddingModel = async (
  modelName: string,
  modelOptions: LocalModelOptions,
) => {
  if (typeof modelOptions.importWasmModule === "function") {
    env.backends.onnx.importWasmModule = modelOptions.importWasmModule;
  } else {
    env.backends.onnx.importWasmModule = wasmLoader;
  }

  env.localModelPath = modelOptions.localModelPath || "models/";
  env.allowRemoteModels = modelOptions.allowRemoteModels || true;
  env.allowLocalModels = modelOptions.allowLocalModels || true;
  env.backends.onnx.wasm.wasmPaths = modelOptions.onnxWasmPaths || "/";
  env.backends.onnx.wasm.proxy =
    typeof modelOptions.onnxProxy !== "undefined"
      ? modelOptions.onnxProxy
      : false;

  const tokenizer = await AutoTokenizer.from_pretrained(modelName);

  // store original reference
  const originalConsole = self.console;

  if (modelOptions.hideOnnxWarnings) {
    // override function reference with a new arrow function that does nothing
    self.console.error = () => {};
  }

  const model = await AutoModel.from_pretrained(modelName, {
    device: modelOptions.device || "webgpu",
    dtype: modelOptions.dtype || "q8",
  });

  if (modelOptions.hideOnnxWarnings) {
    // restore the original function reference, so that console.error() works just as before
    self.console.error = originalConsole.error;
  }

  return {
    tokenizer,
    model,
  };
};

const modelCache: ModelCache = {};

export const embed = async (
  input: string | Array<string> | Array<number> | Array<Array<number>>,
  providerType: Provider,
  params: Params,
  options?: Options,
): Promise<EmbeddingResponse> => {
  if (providerType === "local") {
    const time = performance.now();
    if (!params.model) {
      params.model = "Xenova/multilingual-e5-small";
    }

    if (!modelCache[params.model]) {
      modelCache[params.model] = await loadEmbeddingModel(params.model, {
        ...params.modelOptions,
        importWasmModule: options?.importWasmModule,
      });
    }
    const { tokenizer, model } = modelCache[params.model];

    // TODO! => not ready yet
    const tokenized = tokenizer(input, params.tokenizerOptions);

    console.log("tokenized", tokenized);

    const output = await model(tokenized);

    console.log("output", output);

    return {
      price: {
        input: 0,
        output: 0,
        total: 0,
      },
      data: output,
      elapsedMs: time - performance.now(),
      usage: {
        inputTokens: tokenized.input_ids.length,
        outputTokens: 0,
        totalTokens: tokenized.input_ids.length,
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
