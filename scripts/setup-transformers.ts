import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, createWriteStream } from 'fs';
import { spawnSync } from 'child_process';
import { get } from 'node:https';
import { readFile } from 'node:fs/promises';
import { build } from "esbuild"

const fileToDataUrl = async (filePath: string): Promise<string> => {
  try {
    const fileBuffer = await readFile(filePath);
    const base64Data = fileBuffer.toString('base64');
    return `data:application/octet-stream;base64,${base64Data}`;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

const downloadFile = async (url: string, outputPath: string) => {
  const fileStream = createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    get(url, response => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }

      response.pipe(fileStream);
    }).on('error', reject);

    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
};

// onnxruntime-web custom craft

if (!existsSync('onnxruntime')) {

  // create onnxruntime folder
  mkdirSync('onnxruntime', { recursive: true });
}

// https://raw.githubusercontent.com/kyr0/onnxruntime/main/js/web/script/pull-prebuilt-wasm-artifacts.ts
if (!existsSync('onnxruntime/pull-prebuilt-wasm-artifacts.ts')) {

  console.log("Downloading WASM pull script...")

  const fileUrl = 'https://raw.githubusercontent.com/kyr0/onnxruntime/main/js/web/script/pull-prebuilt-wasm-artifacts.ts';
  await downloadFile(fileUrl, 'onnxruntime/pull-prebuilt-wasm-artifacts.ts');
}

console.log("Pulling pre-built debug WASM runtime files ...")

spawnSync('tsx', ['pull-prebuilt-wasm-artifacts.ts', 'debug', '1441331'], {
  stdio: 'inherit',
  cwd: 'onnxruntime'
});

const runtimeBaseNames = ['ort-wasm-simd-threaded.jsep', 'ort-wasm-simd-threaded'];
const jsRuntimeCodeMap = new Map<string, string>();

for (const baseName of runtimeBaseNames) {  
  // read and cache debug js runtime code
  jsRuntimeCodeMap.set(baseName, readFileSync(`dist/${baseName}.mjs`, 'utf-8'));
}

// load release versions for size optimization (only WASM binary)
spawnSync('tsx', ['pull-prebuilt-wasm-artifacts.ts', 'release', '1441331'], {
  stdio: 'inherit',
  cwd: 'onnxruntime'
});

  // post-process and multi-variant WASM runtime files
for (const baseName of runtimeBaseNames) {

  // read release WASM runtime file variant
  const wasmDataUrl = await fileToDataUrl(`dist/${baseName}.wasm`);

  // fetch code from cache
  let jsRuntimeCode = jsRuntimeCodeMap.get(baseName)!;

  // code injection and auto-deserialization of the wasm binary data
  jsRuntimeCode = jsRuntimeCode.replace('var wasmBinaryFile;', `
    const dataUrlToUint8Array = (dataUrl) => {
      // extract the base64 encoded part from the data URL
      const base64String = dataUrl.split(',')[1];
      
      // decode the base64 string into a binary string
      const binaryString = atob(base64String);
  
      // create a Uint8Array from the binary string
      const binaryLength = binaryString.length;
      const bytes = new Uint8Array(binaryLength);
      
      for (let i = 0; i < binaryLength; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };
    var wasmBinaryFile = '${wasmDataUrl}';
    wasmBinary = dataUrlToUint8Array(wasmBinaryFile);
    `)
  
    // flags explicity set for dead code elimination/tree shaking
    writeFileSync(
      `dist/${baseName}-web.mjs`, 
      jsRuntimeCode.replace("if (isNode) isPthread = (await import('worker_threads')).workerData === 'em-pthread';", '')
        .replace('var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";', 'var ENVIRONMENT_IS_NODE = false;')
        .replace('var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;', 'var ENVIRONMENT_IS_SHELL = false;')
        .replace('var ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && self.name == "em-pthread";', 'var ENVIRONMENT_IS_PTHREAD = false;')
        .replace(/\(ENVIRONMENT_IS_NODE\)/g, '(false)')
        .replace(/\(!ENVIRONMENT_IS_NODE\)/g, '(true)')
        .replace(/\(ENVIRONMENT_IS_SHELL\)/g, '(false)')
        .replace(/\(!ENVIRONMENT_IS_SHELL\)/g, '(true)')
        .replace(/\(ENVIRONMENT_IS_PTHREAD\)/g, '(false)')
        .replace(/\(!ENVIRONMENT_IS_PTHREAD\)/g, '(true)')
    );

    // flags explicity set for dead code elimination/tree shaking
    writeFileSync(`dist/${baseName}-node.mjs`, 
      jsRuntimeCode.replace('var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";', 'var ENVIRONMENT_IS_NODE = true;')
      .replace('var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;', 'var ENVIRONMENT_IS_SHELL = false;')
      .replace('var ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && self.name == "em-pthread";', 'var ENVIRONMENT_IS_PTHREAD = true;')
      .replace('var ENVIRONMENT_IS_WEB = typeof window == "object";', 'var ENVIRONMENT_IS_WEB = false;')
      .replace('var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";', 'var ENVIRONMENT_IS_WORKER = false;')
      .replace(/\(ENVIRONMENT_IS_WEB\)/g, '(false)')
      .replace(/\(!ENVIRONMENT_IS_WEB\)/g, '(true)')
      .replace(/\(ENVIRONMENT_IS_WORKER\)/g, '(false)')
      .replace(/\(!ENVIRONMENT_IS_WORKER\)/g, '(true)')
    );
    rmSync(`dist/${baseName}.mjs`, { recursive: true });
    rmSync(`dist/${baseName}.wasm`, { recursive: true });
}

// remove unnecessary WASM runtime files
rmSync('dist/ort-training-wasm-simd-threaded.mjs', { recursive: true });
rmSync('dist/ort-training-wasm-simd-threaded.wasm', { recursive: true });

// @xenova/transformers.js on-the-fly custom craft
if (!existsSync('transformers.js')) {

  // create transformers.js folder
  mkdirSync('transformers.js', { recursive: true });
}

if (!existsSync('transformers.js/.git')) {

  console.log("Cloning transformers.js...")

  // clone transformers.js
  spawnSync('git', ['clone', 'https://github.com/xenova/transformers.js', '.'], {
    stdio: 'inherit',
    cwd: 'transformers.js'
  });
}

console.log("Using branch v3...")

// use branch v3
spawnSync('git', ['switch', 'v3'], {
  stdio: 'inherit',
  cwd: 'transformers.js'
});

console.log("Pulling updates...")

// pull latest changes
spawnSync('git', ['pull'], {
  stdio: 'inherit',
  cwd: 'transformers.js'
});

console.log("Monkey-patching transformers.js overrides...")

// monkey-patch package.json, to use onnxruntime-web 1.19.0-dev.20240621-69d522f4e9
const packageJson = JSON.parse(readFileSync('transformers.js/package.json', 'utf8'));
packageJson.overrides = {
  ...(packageJson.overrides || {}),
  "onnxruntime-web": "1.19.0-dev.20240621-69d522f4e9",
};
packageJson.main = "./dist/transformers.js",
writeFileSync('transformers.js/package.json', JSON.stringify(packageJson, null, 2));

console.log("Installing dependencies...")
// install dependencies
spawnSync('bun', ['install'], {
  stdio: 'inherit',
  cwd: 'transformers.js'
});

console.log("Monkey patching onnxruntime-web exports for un-minified versions...")
// monkey-patch exports in transformers.js/node_modules/onnxruntime-web/package.json
// this makes sure that transformers.js imports the development version of onnxruntime-web (un-minified)
const onnxruntimeWebPackageJson = JSON.parse(readFileSync('transformers.js/node_modules/onnxruntime-web/package.json', 'utf8'));
onnxruntimeWebPackageJson.exports = {
  ".": {
    "node": {
      "import": "./dist/ort.mjs",
      "require": "./dist/ort.js"
    },
    "import": "./dist/ort.mjs",
    "require": "./dist/ort.js",
    "types": "./types.d.ts"
  },
  "./all": {
    "node": null,
    "import": "./dist/ort.all.mjs",
    "require": "./dist/ort.all.js",
    "types": "./types.d.ts"
  },
  "./wasm": {
    "node": null,
    "import": "./dist/ort.wasm.mjs",
    "require": "./dist/ort.wasm.js",
    "types": "./types.d.ts"
  },
  "./webgl": {
    "node": null,
    "import": "./dist/ort.webgl.mjs",
    "require": "./dist/ort.webgl.js",
    "types": "./types.d.ts"
  },
  "./webgpu": {
    "node": null,
    "import": "./dist/ort.webgpu.mjs",
    "require": "./dist/ort.webgpu.js",
    "types": "./types.d.ts"
  },
  "./training": {
    "node": null,
    "import": "./dist/ort.training.wasm.mjs",
    "require": "./dist/ort.training.wasm.js",
    "types": "./types.d.ts"
  }
};
writeFileSync('transformers.js/node_modules/onnxruntime-web/package.json', JSON.stringify(onnxruntimeWebPackageJson, null, 2));

console.log("Building transformers.js...")

// build transformers.js
spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: 'transformers.js'
});

console.log("Monkey patching for IoC of ONNX WASM runtime...")

// money-patch transformers.js/dist/transformers.js and transformers.js/dist/transformers.cjs to allow IoC of ONNX WASM runtimes
let transformersJs = readFileSync('transformers.js/dist/transformers.js', 'utf8')
// allow to import wasm module using inversion of control: loader function can now be passed down via env
transformersJs = transformersJs.replace(/importWasmModule\(/g, '(typeof env.importWasmModule === "function" ? env.importWasmModule : importWasmModule)(')
writeFileSync('transformers.js/dist/transformers.js', transformersJs)

console.log("Copying transformers.js to node_modules...")
// re-construct phantom dependency in node_modules
rmSync('node_modules/@xenova/transformers.js', { recursive: true });
mkdirSync('node_modules/@xenova/transformers.js', { recursive: true });

spawnSync('cp', ['-R', 'transformers.js', 'node_modules/@xenova/'], {
  stdio: 'inherit',
});

// install playwright browsers
spawnSync('npx', ['playwright', 'install'], {
  stdio: 'inherit',
});

mkdirSync('src/.ort', { recursive: true });

  // copy over WASM/ONNX runtime files
for (const baseName of runtimeBaseNames) {
  spawnSync('cp', [`dist/${baseName}-web.mjs`, `src/.ort/${baseName}-web.mjs`], {
    stdio: 'inherit',
  });

  spawnSync('cp', [`dist/${baseName}-node.mjs`, `src/.ort/${baseName}-node.mjs`], {
    stdio: 'inherit',
  });
}