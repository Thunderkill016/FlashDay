const assert = require('assert');
const { readFileSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const landing = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'app', 'index.html'), 'utf8');
const viteConfig = readFileSync(join(root, 'vite.config.mjs'), 'utf8');

assert.match(landing, /href="landing\.css"/);
assert.match(landing, /href="\/app\/"/);
assert.doesNotMatch(landing, /cdn\.tailwindcss\.com/);
assert.doesNotMatch(landing, /fonts\.googleapis\.com/);

assert.match(app, /href="\.\.\/styles\.css"/);
assert.match(app, /src="\.\.\/main\.js"/);
assert.match(viteConfig, /landing: resolve\(import\.meta\.dirname, 'index\.html'\)/);
assert.match(viteConfig, /app: resolve\(import\.meta\.dirname, 'app\/index\.html'\)/);

console.log('FlashDay entrypoint contract: 8 checks passed');
