import { expect, test } from "vitest";
import { embed } from "../dist/web.mjs";
//import { perf } from "@jsheaven/perf";

test("Make sure the API interface/contract is fulfilled", async () => {
  expect(typeof embed).toEqual("function");
  //expect(typeof loadEmbeddingModel).toEqual("function");
});

/*
test("Can load a local embedding model, WASM, quantized uint8", async () => {
  const { tokenizer, model } = await loadEmbeddingModel(
    "Xenova/multilingual-e5-small",
    {
      modelOptions: {
        hideOnnxWarnings: false,
        allowRemoteModels: false,
        allowLocalModels: true,
        localModelPath: "/models",
        onnxProxy: false,
      },
    },
  );

  expect(tokenizer).toBeDefined();
  expect(model).toBeDefined();
  expect(typeof tokenizer).toEqual("function");
  expect(typeof model).toEqual("function");
});
*/

test("Can infer a local BERT model using XLMRobertaTokenizer tokenizer, qint8, single text string", async () => {
  const embedResult = await embed(
    "Foo",
    "local",
    {
      model: "Xenova/multilingual-e5-small",
      modelParams: {
        pooling: "mean",
        normalize: true,
        quantize: true,
      },
    },
    {
      modelOptions: {
        hideOnnxWarnings: false,
        allowRemoteModels: false,
        allowLocalModels: true,
        localModelPath: "/models",
        onnxProxy: false,
      },
    },
  );

  expect(embedResult).toBeDefined();
  expect(embedResult.data).toBeDefined();
  expect(embedResult.data.length).toEqual(1);
  expect(embedResult.data[0].index).toEqual(0);
  expect(embedResult.data[0].object).toEqual("embedding");
});

test("Can infer a local BERT model using XLMRobertaTokenizer tokenizer, qint8, array of strings", async () => {
  const embedResult = await embed(
    ["Foo", "Bar"],
    "local",
    {
      model: "Xenova/multilingual-e5-small",
      modelParams: {
        pooling: "mean",
        normalize: true,
        quantize: true,
      },
    },
    {
      modelOptions: {
        hideOnnxWarnings: false,
        allowRemoteModels: false,
        allowLocalModels: true,
        localModelPath: "/models",
        onnxProxy: false,
      },
    },
  );

  expect(embedResult).toBeDefined();
  expect(embedResult.data).toBeDefined();
  expect(embedResult.data.length).toEqual(2);
  expect(embedResult.data[0].index).toEqual(0);
  expect(embedResult.data[0].object).toEqual("embedding");
  expect(embedResult.data[1].index).toEqual(1);
  expect(embedResult.data[1].object).toEqual("embedding");
});
