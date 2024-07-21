import { expect, test } from "vitest";
import { embed, loadEmbeddingModel } from "./";
//import { perf } from "@jsheaven/perf";

test("Make sure the API interface/contract is fulfilled", async () => {
  expect(typeof embed).toEqual("function");
  expect(typeof loadEmbeddingModel).toEqual("function");
});

test("Can load a local embedding model, WASM, quantized uint8", async () => {
  const { tokenizer, model } = await loadEmbeddingModel(
    "Xenova/multilingual-e5-small",
    {
      hideOnnxWarnings: false,
      allowRemoteModels: false,
      allowLocalModels: true,
      localModelPath: "/models",
      onnxProxy: false,
      device: "wasm",
      dtype: "q8",
    },
  );

  expect(tokenizer).toBeDefined();
  expect(model).toBeDefined();
  expect(typeof tokenizer).toEqual("function");
  expect(typeof model).toEqual("function");
});
