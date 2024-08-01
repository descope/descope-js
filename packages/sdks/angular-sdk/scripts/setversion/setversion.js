const { writeFile } = require('fs');
const { version } = require('./../../package.json');
const envFile = `export const environment = {
  buildVersion: '${version}'
};
`;

console.log(
  `Writing version ${version} to projects/angular-sdk/src/environment.ts`
);

writeFile('./projects/angular-sdk/src/environment.ts', envFile, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Environment file updated with version: ${version}`);
});

console.log('Writing version done!');
