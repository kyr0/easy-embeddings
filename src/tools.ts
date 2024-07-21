import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const getModelFile = async (modelName: string, cacheDir: string) => {
  const modelPath = resolve(cacheDir, modelName);
  // huggingface-cli download bert-base-uncased
  spawnSync(
    "huggingface-cli",
    ["download", modelName, "--local-dir", modelPath],
    {
      stdio: "inherit",
    },
  );
  return modelPath;
};

export const downloadModel = async (modelName: string, path: string) => {
  const cacheDir = resolve(".", path);
  console.log(`Downloading model ${modelName} to ${cacheDir}...`);
  mkdirSync(cacheDir, { recursive: true });
  await getModelFile(modelName, cacheDir);
};
