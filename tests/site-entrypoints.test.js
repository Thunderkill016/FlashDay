const assert = require('assert');
const { readFileSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const landing = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'app', 'index.html'), 'utf8');
const viteConfig = readFileSync(join(root, 'vite.config.mjs'), 'utf8');
const productBootstrap = readFileSync(join(root, 'product-bootstrap.js'), 'utf8');

assert.match(landing, /href="landing\.css"/);
assert.match(landing, /class="btn-flash mt-8 auth-trigger" href="#" data-auth="signup"/);
assert.match(landing, /id="auth-form" novalidate/);
[
  'auth-providers', 'auth-tabs', 'auth-divider', 'email-field', 'password-field',
  'password-confirm-field', 'forgot-password', 'return-to-signin', 'auth-status'
].forEach((id) => assert.match(landing, new RegExp(`id="${id}"`)));
assert.doesNotMatch(landing, /cdn\.tailwindcss\.com/);
// The Recall Observatory landing intentionally uses its selected display/body/mono
// web fonts. The old "no Google Fonts" assertion belonged to the previous landing.
assert.match(landing, /family=Be\+Vietnam\+Pro/);
assert.match(landing, /family=Bricolage\+Grotesque/);
assert.match(landing, /family=IBM\+Plex\+Mono/);
assert.doesNotMatch(landing, /<script type="module">\s*import \{ createClient \}/);

assert.match(app, /href="\.\.\/styles\.css"/);
assert.match(app, /src="\.\.\/main\.js"/);
assert.match(viteConfig, /const landingEntry = resolve\(import\.meta\.dirname, 'index\.html'\)/);
assert.match(viteConfig, /landing: landingEntry/);
assert.match(viteConfig, /app: resolve\(import\.meta\.dirname, 'app\/index\.html'\)/);
assert.match(viteConfig, /transformIndexHtml/);
assert.match(viteConfig, /landing-auth\.mjs/);
assert.match(productBootstrap, /event === 'INITIAL_SESSION'/);
assert.doesNotMatch(productBootstrap, /auth\.getSession\(\)/);

console.log('FlashDay entrypoint contract: 26 checks passed');
