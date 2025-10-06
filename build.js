// build.js
const { build } = require('vite');

build({
  build: {
    outDir: 'build',
  }
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
