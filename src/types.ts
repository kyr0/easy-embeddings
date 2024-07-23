import type {
  EmbeddingApiOptions,
  EmbeddingParams,
  EmbeddingProvider,
} from "cross-llm";
import type {
  FeatureExtractionPipelineOptions,
  AllTasks,
} from "@xenova/transformers.js";

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
