const glob = require('glob');
const fs = require('fs');
const path = require('path');

// wrap in iife in order to use await
(async function(){
  console.log('Creating merge coverage file...');
  // get all packages coverage file
  const files = await glob('packages/*/coverage/lcov.info');
  // merge into one file
  const mergedReport = files.reduce((mergedReport, currFile) => mergedReport += fs.readFileSync(currFile), '');

  await fs.writeFile(path.resolve('./coverage/lcov.info'), mergedReport, (err) => {
    if (err) throw err;
    console.log('Merge coverage file created successfully');
  });
})();
