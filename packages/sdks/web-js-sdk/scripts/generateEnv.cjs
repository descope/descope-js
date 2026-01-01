const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const outPath = path.join(__dirname, '..', 'examples', 'env.js');

let env = {};

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Handle values with '=' in them
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    });
}

const output = {
  DESCOPE_PROJECT_ID: env.DESCOPE_PROJECT_ID || '',
  DESCOPE_BASE_URL: env.DESCOPE_BASE_URL || '',
};

fs.writeFileSync(
  outPath,
  'window.ENV = ' + JSON.stringify(output, null, 2) + ';\n',
);

console.log('Generated examples/env.js');
