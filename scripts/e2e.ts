import { embed } from "../dist/node.mjs";
import { resolve } from "node:path";

// TODO: dysfunctional right now, as Transformers.js tries to fetch() the model files from local disk... in Node... :/
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
      localModelPath: `file:/${resolve("public/models")}`,
      onnxProxy: false,
    },
  },
);

console.log("embedResult", embedResult)