import { createDescopeCSP, generateNonce, presets } from '../src/index';

console.log('=== @descope/csp Examples ===\n');

console.log('1. Minimal Usage:');
const minimal = createDescopeCSP();
console.log(minimal.toString());
console.log('\n');

console.log('2. With Nonce:');
const nonce = generateNonce();
const withNonce = createDescopeCSP({ nonce });
console.log(`Nonce: ${nonce.substring(0, 20)}...`);
console.log(withNonce.toString());
console.log('\n');

console.log('3. With Custom URLs (Staging):');
const staging = createDescopeCSP({
  urls: {
    api: 'api.staging.descope.com',
    cdn: 'cdn.staging.descope.com',
    static: 'static.staging.descope.com',
    images: 'imgs.staging.descope.com',
  },
});
console.log(staging.toString());
console.log('\n');

console.log('4. With Custom Rules:');
const custom = createDescopeCSP({
  extend: {
    'connect-src': ['https://api.myapp.com', 'wss://realtime.myapp.com'],
    'img-src': ['https://images.myapp.com'],
  },
});
console.log(custom.toString());
console.log('\n');

console.log('5. With Presets:');
const withPresets = createDescopeCSP({
  presets: [presets.googleFonts, presets.segment],
});
console.log(withPresets.toString());
console.log('\n');

console.log('6. Complete Example:');
const complete = createDescopeCSP({
  urls: {
    api: 'api.staging.descope.com',
    cdn: 'cdn.staging.descope.com',
  },
  nonce: generateNonce(),
  extend: {
    'connect-src': ['https://api.myapp.com'],
  },
  presets: [presets.googleFonts],
});
console.log(complete.toString());
console.log('\n');

console.log('7. Programmatic Access:');
console.log('Directives object:', JSON.stringify(complete.directives, null, 2));
