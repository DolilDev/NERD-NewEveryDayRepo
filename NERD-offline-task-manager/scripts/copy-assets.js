// Copies static renderer assets (HTML) into the compiled `dist/` tree.
// tsc only emits JavaScript, so index.html has to be copied separately.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'renderer');
const outDir = path.join(__dirname, '..', 'dist', 'renderer');

fs.mkdirSync(outDir, { recursive: true });

for (const file of ['index.html']) {
  fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
}

console.log('Copied renderer assets to', outDir);
