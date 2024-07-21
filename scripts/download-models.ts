import { downloadModel } from '../src/tools';

console.log("Downloading test embedding model...")
await downloadModel('Xenova/multilingual-e5-small', 'public/models');

