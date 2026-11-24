const path = require('node:path');
const science = require('../plugins/science-artifacts/index.cjs');
science({siteDir: path.resolve(__dirname, '..')}).loadContent().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
