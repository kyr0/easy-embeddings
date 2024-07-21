<span align="center">

  # easy-embeddings

  ### Easy vector embeddings for the web platform. Use open source embedding models locally or an API (OpenAI, Voyage, Mixedbread).

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
const embedding: EmbeddingResponse = await embed(["Hello", "World"], "local", {
  model: "Xenova/multilingual-e5-small",
  normalize: true, 
  pooling: 'average',
  modelOptions: {
    localModelPath: '/models',
    device: "webgpu",
    dtype: "q8",
  },
  tokenizerOptions: {
    padding: true,
    truncation: true,
    max_length: 512,
  },
})
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