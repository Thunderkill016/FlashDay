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
// The Recall Observatory landing intentionally uses its selected display/body/mono
// web fonts. The old "no Google Fonts" assertion belonged to the previous landing.
assert.match(landing, /family=Be\+Vietnam\+Pro/);
assert.match(landing, /family=Bricolage\+Grotesque/);
assert.match(landing, /family=IBM\+Plex\+Mono/);
// Keep malformed "<1m" markup from slipping through even if Vite still emits a build.
assert.doesNotMatch(landing, />\s*<1m/);

assert.match(app, /href="\.\.\/styles\.css"/);
assert.match(app, /src="\.\.\/main\.js"/);
assert.match(viteConfig, /landing: resolve\(import\.meta\.dirname, 'index\.html'\)/);
assert.match(viteConfig, /app: resolve\(import\.meta\.dirname, 'app\/index\.html'\)/);

console.log('FlashDay entrypoint contract: 11 checks passed');
