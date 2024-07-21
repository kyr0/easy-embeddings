<span align="center">

  # easy-embeddings

  ### Easy vector embeddings for the web platform. Use open source embedding models locally or an API (OpenAI, Voyage, Mixedbread).

  > **🔥 Please note:** This project relies on the currently unreleased V3 branch of `@xenova/transformers.js` combined with a patched, development 
  > version of the `onnxruntime-web` to enable the latest, bleeding edge features (WebGPU and WASM acceleration) alongside unparalleled
  > compatibility (even works in Web Extensions Service Workers).

</span>

## 📚 Install

`npm/yarn/bun install easy-embeddings`

## ⚡ Use

### Remote inference (call an API)

#### Single text vector embedding
```ts
import { embed } from "easy-embeddings";

// single embedding, german embedding model
const embedding: EmbeddingResponse = await embed("Hallo, Welt!", "mixedbread-ai", {
  model: "mixedbread-ai/deepset-mxbai-embed-de-large-v1",
  normalized: true,
  dimensions: 512,
}, { apiKey: import.meta.env[`mixedbread-ai_api_key`] })
```

#### Multi-text vector embeddings
```ts
import { embed } from "easy-embeddings";

// single embedding, german embedding model
const embedding: EmbeddingResponse = await embed(["Hello", "World"], "openai", {
  model: "text-embedding-3-small"
}, { apiKey: import.meta.env[`openai_api_key`] })
```

### Local inference

```ts
import { embed } from "easy-embeddings";

// single embedding, german embedding model
const embedResult = await embed(
  ["query: Foo", "passage: Bar"],
  "local",
  {
    // https://huggingface.co/intfloat/multilingual-e5-small
    model: "Xenova/multilingual-e5-small",
    modelParams: {
      pooling: "mean",
      normalize: true, // so a single dot product of two vectors is enough to calculate a similarity score
      quantize: true, // use a quantized variant (more efficient, little less accurate)
    },
  },
  {
    modelOptions: {
      hideOnnxWarnings: false, // show warnings as errors in case ONNX runtime has a bad time
      allowRemoteModels: false, // do not download remote models from huggingface.co
      allowLocalModels: true,
      localModelPath: "/models", // loads the model from public dir subfolder "models"
      onnxProxy: false,
    },
  },
);
```

#### Advanced: Using a custom WASM runtime loader

```ts
import { embed } from "easy-embeddings";
// @ts-ignore
import getModule from "./public/ort-wasm-simd-threaded.jsep";

// single embedding, german embedding model
const embedResult = await embed(
  ["query: Foo", "passage: Bar"],
  "local",
  {
    // https://huggingface.co/intfloat/multilingual-e5-small
    model: "Xenova/multilingual-e5-small",
    modelParams: {
      pooling: "mean",
      normalize: true, // so a single dot product of two vectors is enough to calculate a similarity score
      quantize: true, // use a quantized variant (more efficient, little less accurate)
    },
  },
  {
    importWasmModule:  async (
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
    },
    modelOptions: {
      hideOnnxWarnings: false, // show warnings as errors in case ONNX runtime has a bad time
      allowRemoteModels: false, // do not download remote models from huggingface.co
      allowLocalModels: true,
      localModelPath: "/models", // loads the model from public dir subfolder "models"
      onnxProxy: false,
    },
  },
);
```



### Download models locally

You might want to write and execute a script to manually download a model locally:
```ts
import { downloadModel } from "easy-embeddings/tools";

// downloads the model into the models folder
await downloadModel('Xenova/multilingual-e5-small', 'public/models')
```

## Help improve this project!

### Setup

Clone this repo, install the dependencies (`bun` is recommended for speed),
and run `npm run test` to verify the installation was successful. You may want to play with the experiments.