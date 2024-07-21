import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'fs';
import { spawnSync } from 'child_process';

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

// copy over WASM/ONNX runtime files
spawnSync('cp', ['-R', 'node_modules/onnxruntime-web/dist/', 'public/'], {
  stdio: 'inherit',
});

// monkey-patch the ORT runtime loader to remove the top-level await
let ortWasm = readFileSync('public/ort-wasm-simd-threaded.jsep.mjs', 'utf8');
ortWasm = ortWasm.replace("if (isNode) isPthread = (await import('worker_threads')).workerData === 'em-pthread';", '');
writeFileSync('public/ort-wasm-simd-threaded.jsep.mjs', ortWasm);